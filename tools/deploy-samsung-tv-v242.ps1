# MSS Samsung TV V242 — build, verify, stage, sign and install, no uninstall.
# Execute from VS Code PowerShell: .\tools\deploy-samsung-tv-v242.ps1
param(
  [string]$Target = "QE65Q60BAUXXC",
  [string]$TvAddress = "192.168.1.27:26101",
  [string]$CertificateProfile = "MULTISPORTS_SCORING_TV_65",
  [switch]$SkipLaunch
)
$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$stage = Join-Path $root ".mss-samsung-package-stage"
$tizen = "C:\tizen-studio\tools\ide\bin\tizen.bat"
$sdb = "C:\tizen-studio\tools\sdb.exe"

function Require-LastSuccess([string]$label) {
  if ($LASTEXITCODE -ne 0) { throw "$label : échec (code $LASTEXITCODE). La TV n'a pas été désinstallée." }
}

if (!(Test-Path -LiteralPath $tizen)) { throw "Tizen CLI absent : $tizen" }
if (!(Test-Path -LiteralPath $sdb)) { throw "Samsung SDB absent : $sdb" }
Set-Location $root

Write-Host "`n[1/7] Test anti-régression V242..." -ForegroundColor Cyan
& node ".\tools\test-samsung-v242-adaptive.mjs"
Require-LastSuccess "Test V242"

Write-Host "`n[2/7] Construction Samsung TV..." -ForegroundColor Cyan
& npm run "tv:samsung:build"
Require-LastSuccess "Build TV"

Write-Host "`n[3/7] Précheck Samsung TV..." -ForegroundColor Cyan
& npm run "tv:samsung:check"
Require-LastSuccess "Précheck TV"

Write-Host "`n[4/7] Distribution sans archives ni fichiers Debug..." -ForegroundColor Cyan
& node ".\tools\prepare-samsung-tv-package.mjs"
Require-LastSuccess "Préparation TV"

Write-Host "`n[5/7] Signature avec le profil Samsung existant..." -ForegroundColor Cyan
& $tizen package -t wgt -s $CertificateProfile -- "$stage"
Require-LastSuccess "Signature Tizen"
$source = Join-Path $stage "MULTISPORTS SCORING.wgt"
$package = Join-Path $stage "MULTISPORTS_SCORING.wgt"
if (!(Test-Path -LiteralPath $source)) { throw "WGT signé absent : $source" }
Copy-Item -LiteralPath $source -Destination $package -Force
if (!(Test-Path -LiteralPath $package)) { throw "WGT final absent : $package" }

Write-Host "`n[6/7] Connexion puis installation (sans effacer les données TV)..." -ForegroundColor Cyan
& $sdb connect $TvAddress
$devices = (& $sdb devices | Out-String)
$targetPattern = "(?m)^\s*" + [regex]::Escape($TvAddress) + "\s+device\b"
if ($devices -notmatch $targetPattern) { throw "TV non connectée : $TvAddress. Vérifier le mode développeur et le réseau." }
& $tizen install -n "MULTISPORTS_SCORING.wgt" -t $Target -- "$stage"
Require-LastSuccess "Installation Samsung TV"

Write-Host "`n[7/7] Lancement..." -ForegroundColor Cyan
if (-not $SkipLaunch) {
  & $sdb connect $TvAddress
  & $tizen run -p "wgIoFKG6GG.MULTISPORTSSCORINGTV" -t $Target
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "Application installée, mais lancement CLI non confirmé. Ouvre MSS avec la télécommande."
  }
} else { Write-Host "Lancement automatique ignoré." }
Write-Host "`nDéploiement TV V242 terminé — tests manuels Viewer nécessaires." -ForegroundColor Green
