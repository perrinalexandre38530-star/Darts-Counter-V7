$ErrorActionPreference = "Stop"

$SUPABASE_URL = "https://rckbdaqksujehszafior.supabase.co"
$WORKER_BASE = "https://multisports-tiktok-oauth.perrin-alexandre38530.workers.dev"

$SB_SECURE = Read-Host "Colle ta Secret Key Supabase" -AsSecureString
$SB_SECRET = [System.Net.NetworkCredential]::new("", $SB_SECURE).Password

$headers = @{
    "apikey" = $SB_SECRET
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

function Put-Provider($Identifier, $Body) {
    Write-Host ""
    Write-Host "Mise a jour $Identifier ..."
    $json = $Body | ConvertTo-Json -Depth 10 -Compress
    Invoke-RestMethod `
      -Method Put `
      -Uri "$SUPABASE_URL/auth/v1/admin/custom-providers/$Identifier" `
      -Headers $headers `
      -UserAgent "MULTISPORTS-SCORING-ADMIN/1.0" `
      -Body $json | Out-Null

    Invoke-RestMethod `
      -Method Get `
      -Uri "$SUPABASE_URL/auth/v1/admin/custom-providers/$Identifier" `
      -Headers $headers `
      -UserAgent "MULTISPORTS-SCORING-ADMIN/1.0" |
      Select-Object identifier, provider_type, client_id, scopes, pkce_enabled, enabled, email_optional, authorization_url, token_url, userinfo_url |
      Format-List
}

Write-Host ""
Write-Host "=== SNAPCHAT ==="
$SNAP_ID = Read-Host "Snapchat OAuth Client ID"
$SNAP_SECURE = Read-Host "Snapchat OAuth Client Secret" -AsSecureString
$SNAP_SECRET = [System.Net.NetworkCredential]::new("", $SNAP_SECURE).Password

Put-Provider "custom:snapchat" @{
    name = "Snapchat"
    client_id = $SNAP_ID
    client_secret = $SNAP_SECRET
    authorization_url = "$WORKER_BASE/snapchat/authorize"
    token_url = "$WORKER_BASE/snapchat/token"
    userinfo_url = "$WORKER_BASE/snapchat/userinfo"
    scopes = @(
      "https://auth.snapchat.com/oauth2/api/user.external_id",
      "https://auth.snapchat.com/oauth2/api/user.display_name",
      "https://auth.snapchat.com/oauth2/api/user.bitmoji.avatar"
    )
    pkce_enabled = $true
    email_optional = $true
    enabled = $true
}

Write-Host ""
Write-Host "=== INSTAGRAM PRO ==="
$IG_ID = Read-Host "Instagram App ID (API setup with Instagram Login)"
$IG_SECURE = Read-Host "Instagram App Secret" -AsSecureString
$IG_SECRET = [System.Net.NetworkCredential]::new("", $IG_SECURE).Password

Put-Provider "custom:instagram" @{
    name = "Instagram Pro"
    client_id = $IG_ID
    client_secret = $IG_SECRET
    authorization_url = "$WORKER_BASE/instagram/authorize"
    token_url = "$WORKER_BASE/instagram/token"
    userinfo_url = "$WORKER_BASE/instagram/userinfo"
    scopes = @("instagram_business_basic")
    pkce_enabled = $false
    email_optional = $true
    enabled = $true
}

Write-Host ""
Write-Host "CONFIGURATION SNAPCHAT + INSTAGRAM TERMINEE."
Write-Host "Callback a declarer chez Snap et Meta :"
Write-Host "https://rckbdaqksujehszafior.supabase.co/auth/v1/callback"
