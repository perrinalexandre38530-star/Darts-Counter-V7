@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo ERREUR : Node.js introuvable. Installe Node.js et rouvre Windows Terminal.
  pause
  exit /b 1
)
node "%~dp0tools\mss-ai-control-launcher-v24.mjs"
if errorlevel 1 (
  echo.
  echo La console n'a pas pu demarrer. Les erreurs restent visibles ci-dessus.
  pause
)
endlocal
