param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectPath
)

$ErrorActionPreference = "Stop"
$project = (Resolve-Path $ProjectPath).Path
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
  Write-Host "BŁĄD: Client Components nadal importują @/actions/auth:" -ForegroundColor Red
  $badFiles | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
  exit 1
}

$package = Get-Content -Raw -Path (Join-Path $project "package.json") | ConvertFrom-Json
if ($package.scripts.dev -ne "next dev --webpack") {
  Write-Host "BŁĄD: skrypt dev nie używa Webpack." -ForegroundColor Red
  exit 1
}

Write-Host "Kontrola patcha zakończona powodzeniem." -ForegroundColor Green
Write-Host "Brak bezpośrednich importów auth w Client Components."
Write-Host "Tryb dev: $($package.scripts.dev)"
