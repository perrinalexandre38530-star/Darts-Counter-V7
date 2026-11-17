@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Node.js est introuvable. Installe Node.js puis relance.
 pause
 exit /b 1
)
if "%OPENAI_API_KEY%"=="" (
 echo OPENAI_API_KEY est absente. Configure-la dans Windows puis ouvre un NOUVEAU terminal.
 echo Aucune demande IA ne pourra etre envoyee sans cle.
)
start "MSS IA DEV V15" cmd /k "cd /d ""%~dp0"" && node tools\mss-ai-control-dev-agent-ui-v15.mjs"
timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:4184/"
endlocal
