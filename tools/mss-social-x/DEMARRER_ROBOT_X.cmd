@echo off
setlocal
chcp 65001 >nul
title MSS - ROBOT X DANS TON CHROME HABITUEL
cd /d "%~dp0"
echo =============================================================
echo   MSS - CORRECTION DU ROBOT X : CHROME DEJA CONNECTE
 echo =============================================================
echo.
echo IMPORTANT : Google bloque la connexion dans Chrome automatise.
echo Ce lanceur n'ouvre PLUS le navigateur Playwright separe.
echo Il n'installe aucun package npm et ne touche pas au package.json MSS.
echo.
echo ETAPE INITIALE UNIQUE :
echo 1 - Dans TON Chrome habituel, ouvrir chrome://extensions
 echo 2 - Activer Mode developpeur, puis Charger l'extension non empaquetee.
echo 3 - Selectionner le dossier :
echo     %~dp0extension-chrome
 echo.
echo POUR LANCER LE ROBOT :
echo 4 - Ouvrir https://x.com/multisportsscor dans ce MEME Chrome.
echo 5 - Cliquer sur l'icone Extensions (puzzle), puis
 echo     MSS - Robot visuels officiels X.
echo Le robot installe automatiquement les deux images officielles.
echo AUCUN mot de passe ni code a communiquer.
echo.
echo IMPORTANT : le robot n'ouvre AUCUN nouveau Chrome.
echo Utilise celui ou tu es DEJA connecte au compte MSS.
echo.
echo Si l'extension est deja installee, passe directement a l'etape 5.
echo.
pause
endlocal
