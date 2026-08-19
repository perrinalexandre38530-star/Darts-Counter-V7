# Patch monétisation FREE — base V74

## Objectif
Empêcher un compte FREE de neutraliser la publicité depuis Settings ou via les préférences locales, tout en conservant la suppression des pubs pour les droits Premium / Sans pub vérifiés.

## Changements
- En mode AdMob `production`, `adsEnabled` et `bannersEnabled` sont forcés actifs pour un compte FREE.
- `canRequestPaidAds()` et `canRequestBannerAds()` deviennent les gardes uniques côté runtime.
- Les chemins interstitiel, bannières inline et ticker Home utilisent ces gardes.
- Les interrupteurs Espaces publicitaires / Bannières sont verrouillés en production.
- Le panneau affiche l'état technique des IDs Interstitiel et Rewarded.
- Libellé interstitiel normalisé : `1 PUB / 1 PARTIE`.

## Ce qui reste volontairement désactivé
Les IDs AdMob réels `androidInterstitialId` et `androidRewardedId` restent vides dans `config/admob.public.json`. Aucun plein écran réel n'est activé tant que ces blocs n'ont pas été créés dans AdMob.

## Sécurité Premium
Le garde `getVerifiedAdFreeState().active` reste prioritaire : Premium / Sans pub vérifié ne reçoit aucune publicité payante.
