@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title MSS - ROBOT X OFFICIEL (MODULE ISOLE)
echo.
echo =============================================
echo    MSS - ROBOT LOGO ET COUVERTURE X
 echo =============================================
echo.
echo SECURITE : ce robot est independant du package.json de l'application.
echo Les installations npm sont confinees a : tools\mss-social-x\runtime\
echo Aucun npm install ne sera lance a la racine du projet.
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo ERREUR : Node.js introuvable. Installez Node.js LTS.
  pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo ERREUR : npm introuvable.
  pause
  exit /b 1
)
if not exist "runtime\node_modules\playwright\index.mjs" (
  echo Installation du moteur Playwright dans le sous-dossier Isole...
  if not exist "runtime" mkdir "runtime"
  call npm install --prefix "%~dp0runtime" --no-save --no-package-lock --ignore-scripts --no-audit --no-fund playwright@1.58.0
  if errorlevel 1 (
    echo ERREUR : installation Playwright echouee. Le projet MSS n'a pas ete modifie.
    pause
    exit /b 1
  )
)
echo.
echo ETAPE 1 : le robot ouvre son navigateur Chrome securise.
echo ETAPE 2 : si necessaire, il tente de cliquer "Continuer avec Google".
echo           Ne choisis pas "S'inscrire" : le compte X MSS existe deja !
echo           Valide simplement le compte Google MSS si demande.
echo ETAPE 3 : le robot installe lui-meme le logo et la couverture.
echo           NE PAS cliquer "Suivre" ni selectionner les images manuellement.
echo           Le robot enregistre ensuite un rapport.
echo.
echo IMPORTANT : ce Chrome dedie ne partage pas les cookies TinyFish (cloud).
echo Une seule connexion initiale peut etre necessaire, ensuite elle est conservee.
echo.
node robot-x.mjs
if errorlevel 1 (
  echo.
  echo ECHEC / A VERIFIER : consulter les rapports, ne pas supposer le succes.
) else (
  echo.
  echo Operation terminee : verifier le rapport de controle.
)
echo.
pause
endlocal
