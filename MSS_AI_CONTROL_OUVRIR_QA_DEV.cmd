@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo ERREUR : Node.js introuvable. Ouvrez le projet depuis un terminal disposant de Node.js.
  pause
  exit /b 1
)
if not exist "tools\mss-ai-control-dev-qa-v14.mjs" (
  echo ERREUR : Fichiers V14 absents. Extraire le ZIP a la racine du projet.
  pause
  exit /b 1
)
start "MSS AI CONTROL QA V14" cmd /k "cd /d ""%~dp0"" && node tools\mss-ai-control-dev-qa-v14.mjs"
set "MSS_READY="
for /l %%i in (1,1,20) do (
  if not defined MSS_READY (
    powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 'http://127.0.0.1:4183/'; if($r.StatusCode -eq 200){exit 0}else{exit 1} } catch { exit 1 }" >nul 2>nul
    if not errorlevel 1 set "MSS_READY=1"
    if not defined MSS_READY timeout /t 1 /nobreak >nul
  )
)
if defined MSS_READY (
  start "" "http://127.0.0.1:4183/"
) else (
  echo Le serveur ne repond pas. Lire les erreurs dans la fenetre MSS AI CONTROL QA V14.
  pause
)
