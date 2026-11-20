# PATCH V7(239) — ROBOT SOCIAL X MSS — AUCUN PACKAGE.JSON FOURNI

**Base comparée : `Darts-Counter-V7(239).zip`.**

Ce ZIP contient **uniquement de nouveaux fichiers** dans `tools/mss-social-x/`.
Il ne contient ni `package.json`, ni `pnpm-lock.yaml`, ni fichier de l'application remplacé.

## Installation sans risque pour le projet
1. Dans le projet V7(239) (sur PC), extraire le ZIP **à la racine du projet**, en conservant l'arborescence `tools/mss-social-x/`.
2. Ne déplacer aucun fichier à la racine du projet. Ne pas remplacer `package.json` : il doit rester celui de l'application (230 lignes dans le ZIP V239).
3. Pour exécuter le robot sur Windows, double-cliquer `tools/mss-social-x/DEMARRER_ROBOT_X.cmd`.
4. La dépendance Playwright est installée **uniquement** dans `tools/mss-social-x/runtime/` lors du lancement, sans modifier le package ou le lockfile du projet. Cette installation requiert une connexion Internet.
5. Une session Chrome dédiée est utilisée. Si X exige une authentification, elle doit être effectuée une fois dans la fenêtre du navigateur du robot. Le robot ne lit pas les mots de passe dans les fichiers.

## Périmètre strict
- Compte ciblé : https://x.com/multisportsscor (arrêt si un autre compte est identifié).
- Avatar : `assets/MSS_LOGO_OFFICIEL.jpg` (image originale du propriétaire).
- Couverture : `assets/MSS_COUVERTURE_OFFICIELLE.jpg` (image originale du propriétaire).
- Ne modifie pas la biographie, le site, la sécurité, les posts, le dépôt GitHub ou le code métier MSS.
- Rapports et captures locales : `%LOCALAPPDATA%\MSS_ROBOTS\X_OFFICIEL\rapports`.

**Statut :** patch de code et tests locaux validés. Publication effective des images sur X NON vérifiée tant que le robot n'a pas été exécuté sur un PC connecté au compte.

## Fichiers fournis
- `tools/mss-social-x/DEMARRER_ROBOT_X.cmd`
- `tools/mss-social-x/robot-x.mjs`
- `tools/mss-social-x/robot-utils.mjs`
- `tools/mss-social-x/assets/MSS_LOGO_OFFICIEL.jpg`
- `tools/mss-social-x/assets/MSS_COUVERTURE_OFFICIELLE.jpg`
- `tools/mss-social-x/tests/robot-utils.test.mjs`
- `tools/mss-social-x/LISEZ_MOI.md`

## Intégrité du package existant
- Avant patch, `package.json` V239 : 230 lignes ; SHA-256 `57cceaba95ca61d716613644abf0770eb5768ce763641192c0c2e441ac743a05`.
- Après patch : exactement le même fichier, non inclus dans l'archive du correctif.

Pour les projets déjà mis à jour depuis V239, ce module ne modifie toujours aucun fichier existant : seul le dossier `tools/mss-social-x/` est ajouté.
