@echo off
setlocal
cd /d "%~dp0"
where node.exe >nul 2>&1
if errorlevel 1 (
 echo ERREUR: Node.js est introuvable. Verifiez Node depuis VS Code.
 pause
 exit /b 1
)
if not exist "tools\mss-ai-control-missions-v11.mjs" (
 echo ERREUR: le fichier tools\mss-ai-control-missions-v11.mjs est absent.
 pause
 exit /b 1
)
echo MSS AI CONTROL V11 : lancement des missions QA et audits du projet...
node "tools\mss-ai-control-missions-v11.mjs"
if errorlevel 1 (
 echo Echec du lancement. Le port 4180 est peut-etre deja utilise.
 pause
)
endlocal
