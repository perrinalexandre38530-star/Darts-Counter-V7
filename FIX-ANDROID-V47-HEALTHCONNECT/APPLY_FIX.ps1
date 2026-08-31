param(
    [string]$ProjectRoot = ""
)

$ErrorActionPreference = "Stop"

function Find-ProjectRoot {
    param([string]$Start)

    $candidates = @()
    if ($Start) { $candidates += (Resolve-Path $Start).Path }
    $candidates += $PSScriptRoot
    $candidates += (Split-Path $PSScriptRoot -Parent)
    $candidates += (Get-Location).Path

    foreach ($c in $candidates | Select-Object -Unique) {
        if (Test-Path (Join-Path $c "android\app\build.gradle")) {
            return $c
        }
    }
    return $null
}

$root = Find-ProjectRoot $ProjectRoot
if (-not $root) {
    Write-Host ""
    Write-Host "ERREUR : projet introuvable." -ForegroundColor Red
    Write-Host "Extrais ce ZIP directement a la racine de Darts-Counter-V7-GIT puis relance APPLY_FIX.bat." -ForegroundColor Yellow
    exit 1
}

$gradle = Join-Path $root "android\app\build.gradle"
$mainActivity = Join-Path $root "android\app\src\main\java\com\multisportsscoring\app\MainActivity.java"
$healthPlugin = Join-Path $root "android\app\src\main\java\com\multisportsscoring\app\HealthConnectPlugin.java"

Write-Host "Projet : $root" -ForegroundColor Cyan

# --- Backup ---
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item $gradle "$gradle.$stamp.bak" -Force
if (Test-Path $mainActivity) {
    Copy-Item $mainActivity "$mainActivity.$stamp.bak" -Force
}

# --- 1) Health Connect dependency ---
$gradleText = Get-Content $gradle -Raw

$hcPattern = '(?m)^[ \t]*implementation\s+["'']androidx\.health\.connect:connect-client:[^"'']+["''][ \t]*$'
$hcLine = '    implementation "androidx.health.connect:connect-client:1.1.0"'

if ($gradleText -match $hcPattern) {
    $gradleText = [regex]::Replace($gradleText, $hcPattern, $hcLine)
    Write-Host "[OK] Dependence Health Connect mise a niveau vers 1.1.0" -ForegroundColor Green
} else {
    $depMarker = [regex]'(?m)^dependencies\s*\{\s*$'
    if (-not $depMarker.IsMatch($gradleText)) {
        throw "Bloc dependencies { introuvable dans android/app/build.gradle"
    }
    $gradleText = $depMarker.Replace(
        $gradleText,
        "dependencies {`r`n    // RUNNING PERF / Health Connect`r`n$hcLine",
        1
    )
    Write-Host "[OK] Dependence Health Connect 1.1.0 ajoutee" -ForegroundColor Green
}

Set-Content -Path $gradle -Value $gradleText -Encoding UTF8

# --- 2) MainActivity onResume visibility ---
if (Test-Path $mainActivity) {
    $mainText = Get-Content $mainActivity -Raw
    $newMainText = $mainText -replace '(?m)^(\s*)protected(\s+void\s+onResume\s*\(\s*\)\s*\{)', '$1public$2'
    if ($newMainText -ne $mainText) {
        Set-Content -Path $mainActivity -Value $newMainText -Encoding UTF8
        Write-Host "[OK] MainActivity.onResume : protected -> public" -ForegroundColor Green
    } else {
        Write-Host "[OK] MainActivity.onResume est deja public (ou non present)" -ForegroundColor Green
    }
} else {
    Write-Host "[INFO] MainActivity.java non trouve au chemin attendu" -ForegroundColor Yellow
}

# --- 3) Sanity checks ---
$finalGradle = Get-Content $gradle -Raw
if ($finalGradle -notmatch 'androidx\.health\.connect:connect-client:1\.1\.0') {
    throw "La dependance Health Connect n'a pas ete appliquee."
}

if (Test-Path $healthPlugin) {
    Write-Host "[OK] HealthConnectPlugin.java present" -ForegroundColor Green
} else {
    Write-Host "[ATTENTION] HealthConnectPlugin.java absent." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "PATCH TERMINE." -ForegroundColor Cyan
Write-Host "Dans Android Studio : Sync Project with Gradle Files, puis clique sur Run." -ForegroundColor White
Write-Host ""
