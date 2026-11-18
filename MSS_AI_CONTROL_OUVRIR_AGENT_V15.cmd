@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo ERREUR : Node.js absent du PATH. Rouvrez le terminal ou reinstallez Node.js.
  pause
  exit /b 1
)
node "%~dp0tools\mss-ai-control-launcher-v25.mjs"
if errorlevel 1 (
  echo.
  echo ECHEC de la console. Le journal est a cote du projet dans MSS_AI_CONTROL_REPORTS.
  echo Copiez le message d'erreur ou le journal pour diagnostic.
  pause
)
endlocal
