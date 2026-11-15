# PRÉSIDENT — V6 : passage de relais sécurisé (base V111)

Source : Darts-Counter-V7(111).zip.

Fichier modifié : `src/pages/PresidentPlay.tsx` uniquement.

- Chaque nouveau tour d’un joueur humain démarre par un écran plein écran masquant la main.
- Affiche le nom, l’avatar, la manche, le pli et le nombre de cartes sans révéler leur valeur.
- Bouton de confirmation pour révéler la main et permettre la saisie.
- Les bots jouent sans écran de confirmation.
- L’écran de fin de manche et les taxes restent prioritaires.
- Blocage des actions de lancer / passer tant que le relais n’est pas confirmé.
- Le redémarrage d’une partie réinitialise le relais.

Installation : extraire le ZIP à la racine du projet en remplaçant uniquement le fichier indiqué.

Validation : analyse syntaxique TSX (TypeScript transpileModule) et intégrité ZIP.
Limites : pas de test manuel interactif PC/Android ni de compilation complète de l’application.
