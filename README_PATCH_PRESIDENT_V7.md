# PRÉSIDENT — V7 : annonces et transitions des plis

Base : `Darts-Counter-V7(111).zip` avec application préalable du patch PRÉSIDENT V6 (`PATCH_PRESIDENT_V6_RELAIS_CONFIDENTIALITE_DEPUIS_V111.zip`). Le fichier `PresidentPlay.tsx` fourni ici comprend également les changements de V6 : il peut remplacer directement le fichier de la V111.

## Modification

- `src/pages/PresidentPlay.tsx` (seul fichier de code modifié).
- Lorsqu'un pli se termine, annonce temporaire du joueur qui l'a gagné, de sa dernière combinaison et du numéro du pli suivant.
- La table se vide suivant les règles du moteur ; une transition visuelle courte accompagne la nouvelle table ou les nouvelles cartes posées.
- Annonce non bloquante avec bouton de fermeture ; aucun changement à la logique des fléchettes, aux bots ou aux échanges.
- Respect de la préférence système « réduire les animations ».
- Réinitialisation de l'annonce lors d'une nouvelle manche, d'une annulation ou d'un redémarrage.

## Installation

Extraire le ZIP à la racine de l'application, remplacer le fichier indiqué. Pas de modification de GitHub ni des autres modes.

## Vérifications

Transpilation TSX sans diagnostics syntaxiques ; contrôle du contenu ZIP. La compilation complète et les tests visuels sur PC et Android ne sont pas réalisés.
