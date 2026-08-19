# Patch AdMob Diagnostics V78 — base V77

## Objectif

Pouvoir valider sur Android la couche plein écran AdMob avant de créer les vrais blocs Interstitiel et Rewarded.

## Nouveautés

- Trois actions dans `Settings > Publicité > Android AdMob` :
  - précharger les deux formats ;
  - afficher un interstitiel Google TEST ;
  - afficher un rewarded Google TEST.
- Ces diagnostics utilisent exclusivement les IDs officiels de démonstration Google et ne génèrent aucun revenu.
- Ils restent disponibles même si le compte courant est Premium/Sans pub, car il s'agit d'un diagnostic manuel non monétisé.
- Le rewarded diagnostic ne débloque aucun bonus, pack, thème, entitlement ou droit Premium. Il vérifie uniquement que le SDK retourne bien la récompense.
- Le code Settings utilise un import namespace et teste l'existence des fonctions V78 pour éviter un nouveau crash ESM lors d'un HMR ou d'un patch partiellement remplacé.

## Production

Aucun changement dans `config/admob.public.json` :

- `androidInterstitialId` reste vide ;
- `androidRewardedId` reste vide.

Les vraies pubs plein écran restent donc désactivées tant que leurs blocs n'ont pas été créés dans AdMob.

## Test

`npm run test:admob-diagnostics`
