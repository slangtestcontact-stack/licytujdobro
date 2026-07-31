param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectPath
)

$ErrorActionPreference = "Stop"

$project = (Resolve-Path $ProjectPath).Path
$patchRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceRoot = Join-Path $patchRoot "files"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $project ".patch-backup-1.5.4-$timestamp"

if (-not (Test-Path (Join-Path $project "package.json"))) {
  throw "To nie wygląda na katalog projektu: brak package.json w $project"
}

if (-not (Test-Path (Join-Path $project "src/actions/auth.ts"))) {
  throw "Brak src/actions/auth.ts. Wskaż główny katalog projektu LicytujDobro."
}

$files = Get-ChildItem -Path $sourceRoot -Recurse -File

foreach ($file in $files) {
  $relative = $file.FullName.Substring($sourceRoot.Length + 1)
  $target = Join-Path $project $relative
  $backup = Join-Path $backupRoot $relative

  if (Test-Path $target) {
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $backup) | Out-Null
    Copy-Item -Force $target $backup
  }

  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null
  Copy-Item -Force $file.FullName $target
  Write-Host "Zmieniono: $relative"
}

# Next.js 16 używa domyślnie Turbopack. W tym projekcie zgłaszał on
# błędny graf Client/Server dla Server Actions. Webpack jest oficjalnym
# trybem awaryjnym i zapobiega ponownemu wystąpieniu tego błędu.
$packagePath = Join-Path $project "package.json"
$packageBackup = Join-Path $backupRoot "package.json"
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $packageBackup) | Out-Null
Copy-Item -Force $packagePath $packageBackup

$package = Get-Content -Raw -Path $packagePath | ConvertFrom-Json
$package.scripts.dev = "next dev --webpack"
$package.scripts.build = "next build --webpack"
$package | ConvertTo-Json -Depth 100 | Set-Content -Encoding utf8 -Path $packagePath
Write-Host "Zmieniono: package.json (dev/build -> Webpack)"

# Twarda kontrola: żaden Client Component nie może bezpośrednio importować
# dużego modułu auth, bo zawiera on bazę, next/headers i kod server-only.
$badFiles = @()
Get-ChildItem -Path (Join-Path $project "src") -Recurse -File -Include *.tsx,*.ts | ForEach-Object {
  $content = Get-Content -Raw -Path $_.FullName
  $firstLines = (($content -split "`r?`n") | Select-Object -First 5) -join "`n"
  $isClient = $firstLines -match '["'']use client["'']'
  if ($isClient -and $content.Contains('@/actions/auth')) {
    $badFiles += $_.FullName.Substring($project.Length + 1)
  }
}

if ($badFiles.Count -gt 0) {
  Write-Host ""
  Write-Host "Patch nie przeszedł kontroli. Pozostały importy auth w Client Components:" -ForegroundColor Red
  $badFiles | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
  throw "Niekompletne zastosowanie patcha."
}

$loginPage = Get-Content -Raw -Path (Join-Path $project "src/app/logowanie/page.tsx")
if ($loginPage -match '^[\s\uFEFF]*["'']use client["'']') {
  throw "src/app/logowanie/page.tsx nadal jest Client Component. Patch nie został zastosowany."
}

Remove-Item -Recurse -Force (Join-Path $project ".next") -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Patch 1.5.4 zastosowany poprawnie." -ForegroundColor Green
Write-Host "Kopia zapasowa: $backupRoot"
Write-Host ""
Write-Host "Teraz uruchom w katalogu projektu:"
Write-Host "  npm run typecheck"
Write-Host "  npm run dev"
