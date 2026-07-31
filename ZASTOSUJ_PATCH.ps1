param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectPath
)

$ErrorActionPreference = "Stop"
$PatchRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectPath = (Resolve-Path $ProjectPath).Path
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupRoot = Join-Path $ProjectPath "_patch-backups\v1.7-$Timestamp"
$ProjectSrc = Join-Path $ProjectPath "src"
$ProjectMigration = Join-Path $ProjectPath "scripts\migrate-1.7.mjs"
$BackupMigration = Join-Path $BackupRoot "scripts\migrate-1.7.mjs"
$MigrationExisted = Test-Path $ProjectMigration

if (-not (Test-Path (Join-Path $ProjectPath "package.json"))) {
  throw "Nie znaleziono package.json w: $ProjectPath"
}
if (-not (Test-Path $ProjectSrc)) {
  throw "Nie znaleziono katalogu src w: $ProjectPath"
}
if (-not (Test-Path (Join-Path $ProjectPath ".env"))) {
  throw "Nie znaleziono pliku .env w: $ProjectPath"
}

Write-Host "Tworzenie kopii: $BackupRoot" -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null
Copy-Item -Recurse -Force $ProjectSrc (Join-Path $BackupRoot "src")

if ($MigrationExisted) {
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $BackupMigration) | Out-Null
  Copy-Item -Force $ProjectMigration $BackupMigration
}

try {
  Write-Host "Kopiowanie plików patcha 1.7..." -ForegroundColor Cyan
  Copy-Item -Recurse -Force (Join-Path $PatchRoot "src\*") $ProjectSrc
  New-Item -ItemType Directory -Force -Path (Join-Path $ProjectPath "scripts") | Out-Null
  Copy-Item -Force (Join-Path $PatchRoot "scripts\migrate-1.7.mjs") $ProjectMigration

  $NextPath = Join-Path $ProjectPath ".next"
  if (Test-Path $NextPath) {
    Remove-Item -Recurse -Force $NextPath
  }

  Push-Location $ProjectPath
  try {
    Write-Host "1/3 TypeScript..." -ForegroundColor Cyan
    & npm.cmd run typecheck
    if ($LASTEXITCODE -ne 0) {
      throw "Typecheck zakończył się błędem."
    }

    Write-Host "2/3 Test reguł licytacji..." -ForegroundColor Cyan
    & npm.cmd test -- src/lib/__tests__/core-rules.test.ts
    if ($LASTEXITCODE -ne 0) {
      throw "Test reguł licytacji zakończył się błędem."
    }

    Write-Host "3/3 Migracja bazy 1.7..." -ForegroundColor Cyan
    & node --env-file=.env scripts/migrate-1.7.mjs
    if ($LASTEXITCODE -ne 0) {
      throw "Migracja zakończyła się błędem."
    }
  }
  finally {
    Pop-Location
  }

  Write-Host "" 
  Write-Host "Patch 1.7 zastosowany pomyślnie." -ForegroundColor Green
  Write-Host "Kopia źródeł: $BackupRoot" -ForegroundColor DarkGray
  Write-Host "Uruchom teraz: npm run dev" -ForegroundColor Green
}
catch {
  Write-Host "Błąd: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Przywracanie katalogu src z kopii..." -ForegroundColor Yellow

  if (Test-Path (Join-Path $BackupRoot "src")) {
    if (Test-Path $ProjectSrc) {
      Remove-Item -Recurse -Force $ProjectSrc
    }
    Copy-Item -Recurse -Force (Join-Path $BackupRoot "src") $ProjectSrc
  }

  if ($MigrationExisted -and (Test-Path $BackupMigration)) {
    Copy-Item -Force $BackupMigration $ProjectMigration
  }
  elseif (-not $MigrationExisted -and (Test-Path $ProjectMigration)) {
    Remove-Item -Force $ProjectMigration
  }

  throw
}
