# MSS AI CONTROL — Sentinelle main (V1)

## Règle durable

**Une seule branche de travail utilisateur : `main`.** GitHub `main` est la référence publiée. Aucune création de branche ni push, merge, reset ou suppression automatique par le robot. Les correctifs externes arrivent uniquement en ZIP contenant les fichiers ajoutés/modifiés et sont appliqués volontairement.

## Contrôle avant toute nouvelle livraison

Sur **PC avec Git standard**, à la racine du projet :

```powershell
node tools/mss-main-guard.mjs
```

- `OK` : branche `main`, arbre local propre et commit local égal au commit distant GitHub `main`.
- `BLOQUÉ` : branche différente, fichiers modifiés, divergence GitHub ou vérification réseau impossible. L'outil ne modifie rien.
- `node tools/mss-main-guard.mjs --json` : rapport lisible par d'autres robots IA.
- `--offline` : diagnostic limité, volontairement **non certifiable** et donc bloqué.

**StackBlitz :** son Git simplifié peut refuser `git rev-parse`, `git merge` et `git switch`, et son terminal Node peut ne pas exposer le binaire Git. Ne pas forcer le script si Git n'est pas accessible. Avant de travailler : `git pull origin main`, puis `git status`. Le message « up to date » ne prouve pas à lui seul l'identité du commit ; utiliser l'interface GitHub/StackBlitz si le commit n'est pas disponible.

**PC :** avant de copier le prochain ZIP : `git pull --ff-only origin main`, puis lancer la Sentinelle. Après copie, les modifications locales sont attendues : ne pas lancer la Sentinelle en exigeant un état propre tant que le travail n'est pas sauvegardé/commité.

## Intégration robots

1. Sentinelle : audit Git local vs GitHub, échec fermé, aucune écriture.
2. Pilote QA existant : tests et preuves, en lecture seule.
3. Auditeur QA existant : contrôle indépendant des preuves.
4. Une fois le code volontairement intégré sur `main`, les workflows CI effectuent les tests. Les robots ne peuvent pas inspecter automatiquement le disque local du PC ni une instance StackBlitz non connectée : chacun doit lancer le contrôle dans son environnement.

## À configurer dans GitHub pour empêcher les erreurs humaines

Configurer une **protection/ruleset de `main`** avec vérifications obligatoires, sans imposer de PR si vous souhaitez continuer à travailler directement sur `main`. Ne pas activer la suppression ou le déploiement automatique. Les contrôles GitHub Actions ne sont pas bloquants tant qu'ils ne sont pas sélectionnés comme vérifications requises dans les règles du dépôt.
