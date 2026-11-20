# Robot visuels officiels MSS — YouTube

Ce robot est **indépendant** du robot X et ne remplace AUCUN fichier de l'application.

## Ce que contient le correctif
- `MSS_LOGO_OFFICIEL.jpg` : image carrée d'origine, bit à bit identique à l'image fournie.
- `MSS_COUVERTURE_OFFICIELLE_ORIGINALE.jpg` : image de couverture d'origine, intacte.
- `MSS_COUVERTURE_YOUTUBE_2048x1152.jpg` : original centré, avec bandes sombres verticales supplémentaires en haut et en bas pour respecter le ratio minimum de YouTube ; aucun contenu graphique modifié.
- Extension Chrome Manifest v3 isolée, uniquement accessible à `studio.youtube.com`.

## Exécution (Chrome habituel déjà connecté à YouTube)
1. Extraire ce ZIP sous la racine du projet MSS : aucun fichier existant à remplacer.
2. Dans Chrome ouvrir `chrome://extensions`, mode développeur, `Charger l'extension non empaquetée`.
3. Choisir `tools/mss-social-youtube/extension-chrome`.
4. Ouvrir **YouTube Studio** pour la chaîne officielle `@MultisportsScoring`.
5. Cliquer sur l'icône `MSS — Visuels officiels YouTube` dans la barre d'extensions.
6. Lire le panneau de résultat. Pas de sélection manuelle d'images.

Le robot refuse de fonctionner sur une chaîne d'ID différent de `UC5hOS0Vhb7ob9u9SMs-qqOw`, ne téléverse aucun contenu vidéo, ne publie aucun message, n'accède ni à Gmail ni à Google Drive, et ne change pas le compte Google.

**Limite** : YouTube Studio change parfois ses composants. Le robot détecte les boutons `ytcp-banner-upload` et `ytcp-profile-image-upload` documentés par inspection le 20/11/2026, mais la mise en ligne effective reste à tester. Si YouTube empêche l'importation de fichiers par un navigateur extension, le robot indique un blocage sans prétendre avoir réussi.

**Remarque** : YouTube affiche déjà une photo de profil non identifiée comme le logo officiel fourni ; le robot tente donc de la remplacer. La bannière est actuellement absente.
