# MSS AI CONTROL — V3 : tableau de bord local et rapports

## Installation
Copier les **4 fichiers ajoutés** du ZIP dans le dossier racine du projet en conservant leurs chemins. Aucun fichier existant n'est écrasé. Aucun push GitHub n'est exécuté.

## Utilisation (PC avec Node et Git natif)

```bash
node tools/mss-ai-control-dashboard.mjs
```

Le programme appelle le Précontrôle V2, vérifie `main` via Git et exécute les tests de robots QA **seulement si** la synchronisation est valide. Il produit `latest.html` et `latest.json` dans **`../MSS_AI_CONTROL_REPORTS/`**, dossier frère du dépôt, afin d'éviter tout fichier Git non suivi. Ouvrir `latest.html` dans le navigateur.

```bash
node tools/mss-ai-control-dashboard.mjs --sync-only
node --test tools/test-mss-ai-control-dashboard.mjs
```

`--sync-only` mesure uniquement Git, sans exécuter QA. Le statut `NON_EXECUTE` ne vaut pas `PASS` QA. Un rapport BLOQUÉ est aussi sauvegardé pour expliquer les écarts.

## Précautions
- Rapport statique, hors ligne, échappement HTML de toutes les chaînes issues du diagnostic. Aucune connexion réseau propre au tableau de bord (le Précontrôle interroge GitHub avec `git ls-remote`).
- Pas de synchronisation permanente, pas de push, pas de modification automatique des fichiers du projet.
- Seul le PC qui exécute le script est certifiable. Le commit StackBlitz reste `NON_VERIFIE`, et celui de GitHub n'est affiché comme vérifié que si le Précontrôle l'a réellement lu.
- Les tests QA sont des tests automatisés des robots, pas l'assurance que toute l'application fonctionne.
- Exit code 0: PC aligné et tests PASS (ou `--sync-only` et contrôle Git validé). Exit code 1: blocage/échec de contrôles. Exit code 2: erreur de génération.
- Pour tester avec un diagnostic enregistré : `node tools/mss-ai-control-dashboard.mjs --from-json chemin/rapport-v2.json` ; les sources JSON doivent être fiables car elles alimentent un rapport local.
