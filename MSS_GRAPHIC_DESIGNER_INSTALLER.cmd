@echo off
setlocal
cd /d "%~dp0tools\mss-social-content\graphic-designer"
py -3 -m venv .venv || goto error
.venv\Scripts\python.exe -m pip install -r requirements.txt || goto error
echo Moteur installe. Voir README.md pour les polices et le rendu.
pause
exit /b 0
:error
echo Installation impossible. Verifier Python et la connexion pip.
pause
exit /b 1
