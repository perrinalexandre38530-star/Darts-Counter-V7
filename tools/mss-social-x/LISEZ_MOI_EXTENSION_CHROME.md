# MSS ROBOT X — Utilisation du Chrome habituel, sans Playwright

## Pourquoi ce correctif ?
Les versions précédentes lançaient une nouvelle fenêtre Chrome contrôlée par Playwright. Google peut refuser cette authentification automatisée. **Ton Chrome normal est déjà connecté à X**, mais la session ne peut pas être copiée dans l'autre navigateur. Ce correctif ne tente plus de contourner la protection de Google.

## Installation une fois (aucun mot de passe à transmettre)
1. Décompresse ce ZIP dans le dossier du projet, en conservant les chemins.
2. Ferme les anciennes fenêtres Chrome **du robot** et l'ancien terminal du robot.
3. Dans **ton Chrome habituel où tu es déjà connecté à MSS**, ouvre `chrome://extensions`.
4. Active **Mode développeur** (en haut à droite), puis clique **Charger l'extension non empaquetée**.
5. Sélectionne exactement `tools\mss-social-x\extension-chrome` **comme dossier** (pas les fichiers individuellement).
6. Ouvre `https://x.com/multisportsscor` dans **ce même Chrome**.
7. Clique sur la pièce de puzzle (Extensions), puis **MSS — Robot visuels officiels X**. Tu peux épingler son icône pour les fois suivantes.
8. Le robot ouvre **Modifier le profil**, tente d'installer les deux images sans sélecteur de fichier manuel, valide le recadrage par défaut et enregistre. Un panneau sombre affiche chaque étape et le résultat.

**À ne pas faire :** ne relance pas l'ancien `robot-x.mjs` ni l'ancien Chrome Playwright. N'effectue pas de nouvelle inscription X. Le `DEMARRER_ROBOT_X.cmd` corrigé sert seulement à expliquer la procédure et ouvrir X dans le navigateur habituel.

## Images et sécurité
- `extension-chrome\assets\MSS_LOGO_OFFICIEL.jpg` : image officielle fournie par le propriétaire, 512 × 512.
- `extension-chrome\assets\MSS_COUVERTURE_OFFICIELLE.jpg` : bannière officielle fournie par le propriétaire, 2048 × 762.
- Extension Chrome **Manifest V3**, autorisée sur `https://x.com/*` seulement. Elle ne lit **aucun mot de passe, cookie, e-mail ou fichier Drive**. Elle ne lance aucune publication, ne modifie pas la bio, le lien ni l'identifiant.
- **Vérification stricte** : refuse d'agir si le compte connecté n'est pas `@multisportsscor`.
- Pas d'API externe, pas de clés, aucune installation npm, aucun changement au `package.json` de l'app.

## Vérification
Le panneau indique « SUCCÈS CONFIRMÉ » uniquement si les nouvelles URL d'avatar et de couverture apparaissent dans le DOM après enregistrement. Si l'interface X a changé ou si le navigateur ne permet pas de sélectionner les fichiers par JavaScript, le panneau affiche un échec précis : dans ce cas, envoie une capture, **sans faire les manipulations manuelles de sélection d'images**.

## Limitation
Ce mécanisme reste **non vérifié en production sur ton compte X** depuis cet environnement. L'interface X peut changer et bloquer certains sélecteurs. Une installation d'extension nécessite une validation explicite dans Chrome ; ce n'est pas une installation silencieuse.
