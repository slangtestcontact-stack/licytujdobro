param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectPath
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step([string]$Message) {
  Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Get-RelativeProjectPath([string]$RootPath, [string]$FullPath) {
  $separators = [char[]]@(
    [System.IO.Path]::DirectorySeparatorChar,
    [System.IO.Path]::AltDirectorySeparatorChar
  )
  $rootNormalized = [System.IO.Path]::GetFullPath($RootPath).TrimEnd($separators)
  $fullNormalized = [System.IO.Path]::GetFullPath($FullPath)
  $rootWithSeparator = $rootNormalized + [System.IO.Path]::DirectorySeparatorChar
  $isRoot = $fullNormalized.Equals($rootNormalized, [System.StringComparison]::OrdinalIgnoreCase)
  $isChild = $fullNormalized.StartsWith($rootWithSeparator, [System.StringComparison]::OrdinalIgnoreCase)
  if (-not ($isRoot -or $isChild)) {
    throw "Ścieżka nie należy do projektu: $fullNormalized"
  }
  return $fullNormalized.Substring($rootNormalized.Length).TrimStart($separators)
}

function Copy-ToBackup([string]$TargetPath, [string]$ProjectRoot, [string]$BackupRoot) {
  if (-not (Test-Path -LiteralPath $TargetPath -PathType Leaf)) { return }
  $relative = Get-RelativeProjectPath -RootPath $ProjectRoot -FullPath $TargetPath
  $backupPath = Join-Path $BackupRoot $relative
  $backupDir = Split-Path -Parent $backupPath
  if ($backupDir) { New-Item -ItemType Directory -Force -Path $backupDir | Out-Null }
  if (-not (Test-Path -LiteralPath $backupPath)) {
    Copy-Item -LiteralPath $TargetPath -Destination $backupPath -Force
  }
}

$project = (Resolve-Path -LiteralPath $ProjectPath).Path
if (-not (Test-Path -LiteralPath (Join-Path $project "package.json") -PathType Leaf)) {
  throw "Wskazany katalog nie zawiera package.json: $project"
}
if (-not (Test-Path -LiteralPath (Join-Path $project "src") -PathType Container)) {
  throw "Wskazany katalog nie zawiera folderu src: $project"
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$payloadZip = Join-Path $scriptRoot "payload.zip"
if (-not (Test-Path -LiteralPath $payloadZip -PathType Leaf)) {
  throw "Brak payload.zip obok skryptu. Rozpakuj cały patch do osobnego katalogu."
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $project ".patch-backup-legal-1.5.6-$timestamp"
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("licytujdobro-legal-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null

try {
  Write-Step "Rozpakowywanie bezpiecznego pakietu"
  Expand-Archive -LiteralPath $payloadZip -DestinationPath $tempRoot -Force

  Write-Step "Tworzenie kopii i podmiana plików"
  $payloadFiles = Get-ChildItem -LiteralPath $tempRoot -Recurse -File
  foreach ($payloadFile in $payloadFiles) {
    $relative = Get-RelativeProjectPath -RootPath $tempRoot -FullPath $payloadFile.FullName
    $target = Join-Path $project $relative
    Copy-ToBackup -TargetPath $target -ProjectRoot $project -BackupRoot $backupRoot
    $targetDir = Split-Path -Parent $target
    if ($targetDir) { New-Item -ItemType Directory -Force -Path $targetDir | Out-Null }
    Copy-Item -LiteralPath $payloadFile.FullName -Destination $target -Force
    Write-Host "  + $relative"
  }

  Write-Step "Usuwanie publicznej sekcji Pilotaż"
  $removePaths = @(
    "src/app/pilotaz/page.tsx",
    "src/components/pilot-feedback-form.tsx"
  )
  foreach ($relative in $removePaths) {
    $target = Join-Path $project $relative
    if (Test-Path -LiteralPath $target -PathType Leaf) {
      Copy-ToBackup -TargetPath $target -ProjectRoot $project -BackupRoot $backupRoot
      Remove-Item -LiteralPath $target -Force
      Write-Host "  - $relative"
    }
  }
  $pilotDir = Join-Path $project "src/app/pilotaz"
  if ((Test-Path -LiteralPath $pilotDir -PathType Container) -and -not (Get-ChildItem -LiteralPath $pilotDir -Force)) {
    Remove-Item -LiteralPath $pilotDir -Force
  }

  Write-Step "Aktualizacja wersji zasad i komunikatów prywatności"
  $replacements = [ordered]@{
    "2026-07-v1" = "2026-07-v2"
    "Musisz zaakceptować politykę prywatności." = "Musisz potwierdzić zapoznanie się z polityką prywatności."
    "Potwierdź pełnoletność i zaakceptuj regulamin oraz politykę prywatności." = "Potwierdź pełnoletność, zaakceptuj regulamin i potwierdź zapoznanie się z polityką prywatności."
  }
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  $sourceFiles = Get-ChildItem -LiteralPath (Join-Path $project "src") -Recurse -File |
    Where-Object { $_.Extension -in @(".ts", ".tsx") }
  foreach ($sourceFile in $sourceFiles) {
    $old = [System.IO.File]::ReadAllText($sourceFile.FullName)
    $new = $old
    foreach ($entry in $replacements.GetEnumerator()) {
      $new = $new.Replace([string]$entry.Key, [string]$entry.Value)
    }
    if ($new -ne $old) {
      Copy-ToBackup -TargetPath $sourceFile.FullName -ProjectRoot $project -BackupRoot $backupRoot
      [System.IO.File]::WriteAllText($sourceFile.FullName, $new, $utf8NoBom)
      $relative = Get-RelativeProjectPath -RootPath $project -FullPath $sourceFile.FullName
      Write-Host "  ~ $relative"
    }
  }

  Write-Step "Kontrola struktury patcha"
  $required = @(
    "src/lib/legal-config.ts",
    "src/actions/legal.ts",
    "src/components/legal-forms.tsx",
    "src/app/prawne/regulamin/page.tsx",
    "src/app/prawne/polityka-prywatnosci/page.tsx",
    "src/app/prawne/zgloszenia/page.tsx"
  )
  foreach ($relative in $required) {
    if (-not (Test-Path -LiteralPath (Join-Path $project $relative) -PathType Leaf)) {
      throw "Po instalacji brakuje pliku: $relative"
    }
  }

  $pilotMatches = Get-ChildItem -LiteralPath (Join-Path $project "src") -Recurse -File |
    Select-String -SimpleMatch 'href="/pilotaz"' -ErrorAction SilentlyContinue
  if ($pilotMatches) {
    throw "W kodzie nadal występuje publiczny link /pilotaz. Sprawdź: $($pilotMatches.Path -join ', ')"
  }

  $legalClientFile = Join-Path $project "src/components/legal-forms.tsx"
  if (Select-String -LiteralPath $legalClientFile -SimpleMatch '@/actions/legal' -Quiet) {
    throw "Komponent klientowy legal-forms.tsx nie może bezpośrednio importować całego modułu akcji."
  }

  Write-Step "Oznaczanie wersji projektu jako 1.5.6"
  $packageJson = Join-Path $project "package.json"
  $packageLock = Join-Path $project "package-lock.json"
  Copy-ToBackup -TargetPath $packageJson -ProjectRoot $project -BackupRoot $backupRoot
  Copy-ToBackup -TargetPath $packageLock -ProjectRoot $project -BackupRoot $backupRoot
  $versionScript = Join-Path $tempRoot "set-version.cjs"
  $versionCode = @'
const fs = require("node:fs");
const path = require("node:path");
const root = process.argv[2];
for (const name of ["package.json", "package-lock.json"]) {
  const target = path.join(root, name);
  if (!fs.existsSync(target)) continue;
  const json = JSON.parse(fs.readFileSync(target, "utf8"));
  json.version = "1.5.6";
  if (name === "package-lock.json" && json.packages && json.packages[""]) {
    json.packages[""].version = "1.5.6";
  }
  fs.writeFileSync(target, JSON.stringify(json, null, 2) + "\n", "utf8");
}
'@
  [System.IO.File]::WriteAllText($versionScript, $versionCode, $utf8NoBom)
  & node $versionScript $project
  if ($LASTEXITCODE -ne 0) {
    throw "Nie udało się ustawić wersji 1.5.6."
  }

  Write-Step "Czyszczenie cache Next.js"
  $nextCache = Join-Path $project ".next"
  if (Test-Path -LiteralPath $nextCache) {
    Remove-Item -LiteralPath $nextCache -Recurse -Force
  }

  Write-Step "Uruchamianie TypeScript typecheck"
  Push-Location $project
  try {
    & npm run typecheck
    if ($LASTEXITCODE -ne 0) {
      throw "Typecheck zakończył się kodem $LASTEXITCODE. Kopia plików znajduje się w: $backupRoot"
    }
  }
  finally {
    Pop-Location
  }

  Write-Host "`nPATCH ZAINSTALOWANY POPRAWNIE" -ForegroundColor Green
  Write-Host "Kopia poprzednich plików: $backupRoot"
  Write-Host "Migracja bazy nie jest potrzebna."
  Write-Host "Uzupełnij dane prawne w .env i pozostaw LEGAL_PUBLISH_READY=false do końcowego przeglądu."
  Write-Host "Następnie uruchom: npm run dev"
}
finally {
  if (Test-Path -LiteralPath $tempRoot) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}
