# MSS AI CONTROL — V2 : Précontrôle MAIN + robots QA

## Objectif
Éviter les correctifs développés sur une base obsolète. **Une seule branche de travail : `main`**. Livraison des modifications en **ZIP contenant uniquement les fichiers modifiés ou ajoutés**. Aucun push/PR automatique.

## Depuis le PC (VS Code, Git natif)

```bash
node tools/mss-ai-control-preflight.mjs
```

- `--sync-only` : contrôle de branche, commit GitHub et état local, sans exécuter QA.
- `--json` : rapport JSON sur stdout, lisible par un tableau de bord, sans écriture de fichier.
- Les tests Sentinelle, Précontrôle, Pilote, Conseiller IA (tests hors réseau) et Auditeur ne sont lancés **que si la synchronisation est vérifiée**.
- En cas de divergence, l'arrêt est volontaire. La commande **ne répare pas Git** et n'efface rien.
- En mode JSON, ne pas interpréter `scope: sync-only` comme une validation des tests QA.

## StackBlitz : limite explicite

StackBlitz peut utiliser une implémentation réduite de Git (absence de `switch`, `merge`, `rev-parse`, `ls-remote` ou `symbolic-ref`). `git status` propre n'établit **pas** l'égalité des commits GitHub et StackBlitz. Ne pas considérer un échec du précontrôle comme une régression applicative. Pour synchroniser quand le dossier est propre, `git pull origin main` a fonctionné dans cet environnement, puis contrôler l'état depuis l'interface du dépôt ; le contrôle certifiant s'effectue sur le PC avec Git natif.

## Robots / sécurité

- Sentinelle : état de `main` et différences GitHub (lecture seule).
- Pilote QA : récolte d'indices des runs autorisés (lecture seule du code).
- Auditeur QA : analyse indépendante des preuves.
- Précontrôle V2 : fait fonctionner les tests internes des trois robots *après* vérification Git, mais ne déclenche **pas** de mission Issues, n'appelle **aucune IA payante**, ne modifie **aucun fichier**, ne déploie et n'envoie aucun résultat à un service distant.

## Processus recommandé

1. Partir du ZIP de référence le plus récent.
2. Avant de préparer un nouveau patch, lancer le précontrôle sur le PC.
3. Si BLOQUÉ, sauvegarder les modifications locales et résoudre l'écart de commit avec GitHub ; ne pas utiliser `reset --hard`.
4. Si PASS, réaliser les changements et livrer un ZIP incrémental.
5. Tester/installer le ZIP ; le contrôle est à refaire **avant** l'intervention suivante.

**Limite :** ce précontrôle n'assure pas une synchronisation continue entre trois machines, ni l'absence de bugs dans l'application. Il vérifie des conditions précises au moment de son exécution. Il ne remplace pas la revue humaine des corrections.
