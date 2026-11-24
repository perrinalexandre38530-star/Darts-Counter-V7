@echo off
setlocal
cd /d "%~dp0tools\mss-social-content\graphic-designer"
start "MSS Graphic Designer" cmd /k node review-server.mjs
start "" http://127.0.0.1:4186/
