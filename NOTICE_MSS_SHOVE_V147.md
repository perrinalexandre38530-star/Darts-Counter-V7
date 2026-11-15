# SHOVE A PENNY — correctif V147, sur Darts-Counter-V7(105).zip

## Changements
- Exports Historique V4 : restauration des participants manquants d'un rapport générique tronqué (par ex. 2 sur 10) grâce aux identifiants sauvegardés, sans fusionner deux profils homonymes.
- Ordre du classement conservé : classement officiel, ordre des arrivées et rangs présents dans `summary.playerStats`, avant l'ordre de sélection.
- Historiques compacts plus anciens : lorsque les marques par secteur ont disparu mais que les totaux `marks` et `closedCases` subsistent, exploitation de ces totaux uniquement s'ils sont entiers et cohérents avec la variante ; sinon affichage de données inconnues.
- Nouveaux tests reproductibles V147 inclus dans `test:shove:integrity` et dans une commande dédiée : `npm run test:shove:production-v147`.

## Fichiers présents
- `src/lib/shoveAPennyHistoryReport.ts`
- `tools/test-shove-v147-complete-cross-device-roster.mjs`
- `package.json` (scripts de tests uniquement)
- cette notice

## Tests exécutés
- `npm run test:shove:integrity` : réussi (test avec TypeScript global temporairement disponible)
- `npm run test:shove:production-v147` : réussi
- tests V40, V101, V128, V129 : réussis
- analyse syntaxique du fichier TypeScript modifié : réussie
- test V102 non exécuté : module `esbuild` absent de l'environnement local

## Non validé ici
- `npm run typecheck` / compilation Vite/Android complète (dépendances npm du projet non installées localement)
- transfert réel NAS/Cloud entre PC et Android
- génération/partage natifs sur Android

Installer exclusivement sur la référence V7(105), sans recopier l'ensemble de l'application.
Ce correctif ne modifie pas l'interface PLAY, le moteur SHOVE ni les données historiques existantes.
