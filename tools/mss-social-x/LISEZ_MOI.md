# CORRECTIF DU LANCEUR ROBOT X — 20 NOVEMBRE 2026

Ce petit patch remplace **uniquement** `robot-x.mjs`, le lanceur `DEMARRER_ROBOT_X.cmd` et cette notice.
Le `package.json` de MULTISPORTS SCORING n'est **pas** inclus ni modifié.
Le dossier `assets` et ses deux images officielles installées précédemment restent inchangés.

## Pourquoi X montrait la page « Se connecter » ?

Le navigateur Chrome ouvert par le CMD est **indépendant** de la session TinyFish distante.
Il ne peut pas réutiliser automatiquement la connexion X déjà créée dans TinyFish.
Le robot ne peut donc pas modifier un profil tant qu'il n'est pas connecté à X localement.

## Procédure minimale

1. Remplace les trois fichiers du correctif dans `tools/mss-social-x/`.
2. Double-clique `DEMARRER_ROBOT_X.cmd`.
3. **Le robot essaie lui-même de choisir « Continuer avec Google »** sur l'écran de connexion X.
4. Si Google demande de choisir un compte, sélectionne **multisports.scoring@gmail.com** et valide sa connexion / vérification sur l'appareil approprié. N'envoie aucun code dans le chat.
5. Ne crée pas de compte supplémentaire et ne clique pas sur « Suivre » sur le profil public. L'agent doit reconnaître **@multisportsscor** avant de toucher aux images.
6. Dès que le compte X est reconnu connecté, l'agent sélectionne lui-même le logo officiel et la couverture depuis `assets/` et demande l'enregistrement.
7. Vérifie le rapport : `%LOCALAPPDATA%\MSS_ROBOTS\X_OFFICIEL\rapports\`.

Si une confirmation Google réapparaît, elle relève de la sécurité du compte et ne doit pas être contournée.
La session locale du Chrome dédié est conservée pour les prochains lancements.

## Sécurité

- Aucun changement à la racine du projet ou à `package.json`.
- Aucun nouveau compte créé, aucune publication, aucun paiement.
- Upload refusé si le compte connecté n'est pas **@multisportsscor**.
- Le robot conserve la biographie et le site du profil.
- Statut **non vérifié** tant que le rapport n'annonce pas explicitement `SUCCES_CONFIRME`.
