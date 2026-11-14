# MSS AI CONTROL — Console V4 (local PC)

## Démarrer

Depuis VS Code sur le PC, avec Node.js 22 et Git natif :

```bash
node tools/mss-ai-control-live.mjs
```

Ouvrir **http://127.0.0.1:4178** dans le navigateur. La console lance un contrôle au démarrage, puis le bouton « Relancer le contrôle » répète le contrôle à la demande. Arrêt avec **Ctrl+C**.

## Ce que V4 contrôle réellement

- Branche et commit local du PC, GitHub `main` via `git ls-remote`, et modifications non enregistrées.
- Génère `latest.html` / `latest.json` via V3, dans le dossier `MSS_AI_CONTROL_REPORTS` **à côté du dépôt**.
- Ne relance que le précontrôle de synchronisation (`--sync-only`) pour une réponse rapide. Pour les tests QA complets, lancer `node tools/mss-ai-control-dashboard.mjs`.
- StackBlitz reste **NON VÉRIFIÉ**, car son terminal émule Git et ne garantit pas une lecture fiable du commit. La console locale ne peut pas observer son espace de travail.

## Sécurité

- Écoute **seulement** sur 127.0.0.1 ; le port par défaut est 4178.
- Les requêtes cross-origin sont refusées pour la relance.
- Aucune commande Git mutante : ni `push`, `pull`, `reset`, `merge`, `checkout`, `switch`.
- Aucun déploiement, aucun accès à des secrets, aucune écriture dans le dépôt.
- La console V4 ne constitue pas encore un panneau distant MSS AI CONTROL accessible depuis StackBlitz.

## Tests

```bash
node --test tools/test-mss-ai-control-live.mjs
node --check tools/mss-ai-control-live.mjs
```
