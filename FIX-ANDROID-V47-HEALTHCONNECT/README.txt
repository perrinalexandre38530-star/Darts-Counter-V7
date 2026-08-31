FIX ANDROID V47 - HEALTH CONNECT

UTILISATION
1. Extraire le contenu de ce ZIP directement a la racine du projet Darts-Counter-V7-GIT.
   Le fichier APPLY_FIX.bat doit donc se trouver au meme niveau que le dossier "android".
2. Double-cliquer sur APPLY_FIX.bat.
3. Dans Android Studio : Sync Project with Gradle Files.
4. Cliquer sur Run app.

Le correctif :
- ajoute / remet androidx.health.connect:connect-client:1.1.0 dans android/app/build.gradle ;
- corrige onResume() en public dans MainActivity.java si necessaire ;
- cree automatiquement des sauvegardes .bak avant modification.

Il ne remplace pas le reste de ton build.gradle et ne supprime aucune dependance existante.
