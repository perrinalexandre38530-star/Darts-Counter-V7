# Patch AdMob Fullscreen V76 — base V75

## Objectif

Préparer la couche plein écran AdMob sans activer de faux IDs en production.

## Interstitiel fin de partie

- Politique conservée : compte FREE, 1 tentative après chaque partie réellement sauvegardée.
- Jamais avant l'affichage du résultat.
- Le chargement réseau démarre en arrière-plan dès la persistance de la partie.
- Quand le joueur quitte le tableau final, l'interstitiel déjà préparé est affiché.
- Si le chargement échoue ou si aucun ID réel n'existe, la navigation continue normalement.
- Premium / Sans pub vérifié annule l'affichage.
- Une pub préparée est invalidée après affichage et n'est jamais réutilisée.

## Rewarded

- Préchargement natif disponible.
- L'API retourne désormais `earned: true` uniquement quand le SDK AdMob résout avec un `AdMobRewardItem`.
- Fermer une publicité sans gagner la récompense ne doit jamais attribuer de bonus.
- Aucun emplacement rewarded métier n'est activé tant qu'une récompense produit n'a pas été validée (ex. thème temporaire, bonus cosmétique, etc.).
- Aucun ID de démonstration n'est utilisé en production si l'ID rewarded réel est vide.

## IDs restant à créer dans AdMob

`config/admob.public.json` conserve volontairement :

- `androidInterstitialId: ""`
- `androidRewardedId: ""`

Une fois les deux blocs créés dans AdMob, renseigner leurs IDs `ca-app-pub-.../...` puis relancer les contrôles de release.

## Tests

- `npm run test:interstitial-every-match`
- `npm run test:monetization`
- `npm run test:monetization-free-lock`
- `npm run test:admob-native`
- `npm run test:admob-fullscreen`
