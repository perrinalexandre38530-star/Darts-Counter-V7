@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Node.js est introuvable. Verifier son installation.
 pause
 exit /b 1
)
start "MSS AI CONTROL DEV V12" cmd /k node "tools\mss-ai-control-dev-v12.mjs"
for /l %%i in (1,1,25) do (
 powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 http://127.0.0.1:4181/ | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
 if not errorlevel 1 goto ready
 timeout /t 1 /nobreak >nul
)
echo La console ne repond pas. Consulter la fenetre serveur.
pause
exit /b 1
:ready
start "" "http://127.0.0.1:4181/"
