$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
try {
  $client = New-Object System.Net.Sockets.TcpClient
  try { $client.Connect('127.0.0.1',4184); $occupied=$true } catch { $occupied=$false } finally { $client.Dispose() }
  if ($occupied) { Write-Host 'Fermez la console MSS existante avant de connecter X, puis relancez ce fichier.'; exit 1 }
  if (-not $env:MSS_X_USER_ACCESS_TOKEN) {
    $secret = Read-Host 'Jeton OAuth 2.0 UTILISATEUR X (saisie masquee, vide = quitter)' -AsSecureString
    if ($secret.Length -eq 0) { exit 1 }
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
    try { $env:MSS_X_USER_ACCESS_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr); $secret.Dispose() }
  }
  & node (Join-Path $root 'tools/mss-ai-control-launcher-v25.mjs')
  exit $LASTEXITCODE
} finally { Remove-Item Env:MSS_X_USER_ACCESS_TOKEN -ErrorAction SilentlyContinue }
