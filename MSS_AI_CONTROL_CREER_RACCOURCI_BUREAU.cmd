@echo off
setlocal EnableExtensions
set "PROJECT=%~dp0"
set "PS_SCRIPT=%PROJECT%tools\mss-ai-control-shortcut-v26.ps1"
if not exist "%PS_SCRIPT%" (
  echo ERREUR : script V26 absent dans le dossier tools.
  echo Extraire le ZIP V26 a la racine du projet Darts-Counter-V7-GIT.
  pause
  exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%" -ProjectRoot "%PROJECT%"
if errorlevel 1 (
  echo.
  echo La creation du raccourci a echoue. Lire le message ci-dessus.
  pause
  exit /b 1
)
echo.
echo Le raccourci peut maintenant etre utilise depuis le Bureau.
pause
endlocal
