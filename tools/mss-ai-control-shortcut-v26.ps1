# MSS AI CONTROL V26 - raccourci Bureau vers le lanceur existant.
# Aucune modification Git, aucune execution du moteur IA, aucun secret enregistre.
param([Parameter(Mandatory = $true)][string]$ProjectRoot)
$ErrorActionPreference = 'Stop'
try {
  $root = (Resolve-Path -LiteralPath $ProjectRoot).Path
  $launcher = Join-Path $root 'MSS_AI_CONTROL_OUVRIR_AGENT_V15.cmd'
  $server = Join-Path $root 'tools\mss-ai-control-dev-agent-ui-v15.mjs'
  $supervisor = Join-Path $root 'tools\mss-ai-control-launcher-v25.mjs'
  foreach ($file in @($launcher, $server, $supervisor)) {
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
      throw "Fichier requis introuvable : $file`nVerifier que le patch V25 est bien installe dans ce projet."
    }
  }
  $desktop = [Environment]::GetFolderPath('DesktopDirectory')
  if ([string]::IsNullOrWhiteSpace($desktop) -or -not (Test-Path -LiteralPath $desktop -PathType Container)) {
    throw 'Le dossier Bureau Windows est introuvable.'
  }
  $linkPath = Join-Path $desktop 'MSS AI CONTROL - Robot developpeur.lnk'
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($linkPath)
  $shortcut.TargetPath = $launcher
  $shortcut.WorkingDirectory = $root
  $shortcut.Description = 'Demarrer MSS AI CONTROL depuis le projet, sans changer de branche Git'
  $shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,44"
  $shortcut.Save()
  Write-Host "SUCCES : raccourci cree sur le Bureau : $linkPath" -ForegroundColor Green
  Write-Host "Cible : $launcher"
  Write-Host 'Le serveur doit rester ouvert pendant les missions.'
} catch {
  Write-Host "ECHEC : $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
