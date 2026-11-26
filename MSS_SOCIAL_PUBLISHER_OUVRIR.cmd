@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -File "%~dp0tools\mss-social-content\graphic-designer\open-publisher.ps1"
if errorlevel 1 pause
endlocal
