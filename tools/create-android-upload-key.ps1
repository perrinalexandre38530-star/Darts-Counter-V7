param(
  [string]$Alias = "multisports-upload"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$AndroidDir = Join-Path $ProjectRoot "android"
$KeyStorePath = Join-Path $AndroidDir "upload-keystore.jks"
$PropertiesPath = Join-Path $AndroidDir "key.properties"

if (Test-Path $KeyStorePath) {
  throw "Le keystore existe déjà: $KeyStorePath. Ne le remplace pas : conserve toujours la même clé d'upload Google Play."
}
if (Test-Path $PropertiesPath) {
  throw "android/key.properties existe déjà. Supprime-le uniquement si tu sais exactement pourquoi."
}

$keytool = Get-Command keytool -ErrorAction Stop
Write-Host "MULTISPORTS SCORING - création de la clé d'upload Google Play" -ForegroundColor Cyan
Write-Host "Cette clé reste uniquement sur ce PC et ne doit JAMAIS être commitée dans GitHub." -ForegroundColor Yellow

$secure1 = Read-Host "Choisis un mot de passe (minimum 6 caractères)" -AsSecureString
$secure2 = Read-Host "Confirme le mot de passe" -AsSecureString

function Get-PlainText([Security.SecureString]$Secure) {
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

$plain1 = Get-PlainText $secure1
$plain2 = Get-PlainText $secure2
if ($plain1 -ne $plain2) { throw "Les mots de passe ne correspondent pas." }
if ($plain1.Length -lt 6) { throw "Le mot de passe doit contenir au moins 6 caractères." }

try {
  $env:MSC_UPLOAD_STORE_PASSWORD = $plain1
  $env:MSC_UPLOAD_KEY_PASSWORD = $plain1

  & $keytool.Source -genkeypair -v `
    -keystore $KeyStorePath `
    -storetype JKS `
    -keyalg RSA `
    -keysize 4096 `
    -sigalg SHA256withRSA `
    -validity 10000 `
    -alias $Alias `
    -dname "CN=MULTISPORTS SCORING, OU=Android, O=MULTISPORTS SCORING, L=France, C=FR" `
    -storepass:env MSC_UPLOAD_STORE_PASSWORD `
    -keypass:env MSC_UPLOAD_KEY_PASSWORD

  if ($LASTEXITCODE -ne 0) { throw "keytool a échoué avec le code $LASTEXITCODE" }

  $escapedPassword = $plain1.Replace("\", "\\")
  $propertiesContent = @"
storeFile=upload-keystore.jks
storePassword=$escapedPassword
keyAlias=$Alias
keyPassword=$escapedPassword
"@
  [System.IO.File]::WriteAllText($PropertiesPath, $propertiesContent, ([System.Text.UTF8Encoding]::new($false)))

  Write-Host "" 
  Write-Host "✅ Clé d'upload créée: $KeyStorePath" -ForegroundColor Green
  Write-Host "✅ Configuration locale créée: $PropertiesPath" -ForegroundColor Green
  Write-Host "IMPORTANT: sauvegarde upload-keystore.jks + le mot de passe dans un endroit sûr et hors du dépôt Git." -ForegroundColor Yellow
  Write-Host "Prochaine commande: npm run android:play:aab" -ForegroundColor Cyan
}
finally {
  Remove-Item Env:MSC_UPLOAD_STORE_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:MSC_UPLOAD_KEY_PASSWORD -ErrorAction SilentlyContinue
  $plain1 = $null
  $plain2 = $null
}
