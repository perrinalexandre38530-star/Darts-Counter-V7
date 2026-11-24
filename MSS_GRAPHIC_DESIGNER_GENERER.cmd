@echo off
setlocal
cd /d "%~dp0tools\mss-social-content\graphic-designer"
if not exist .venv\Scripts\python.exe (echo Lancer MSS_GRAPHIC_DESIGNER_INSTALLER.cmd d'abord & pause & exit /b 1)
.venv\Scripts\python.exe designer.py render --lang all
if errorlevel 1 echo Certains rendus ont echoue : consulter le catalogue.
pause
