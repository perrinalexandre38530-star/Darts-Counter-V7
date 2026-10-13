# CARGO — STAGE 13 — GAMEPLAY CLARITY

Base vérifiée : branche principale alignée sur le commit `fc0ffd59a82bfcafe9641109e7e52d33d1cb962e` (correspondant au dernier état V13 fourni au moment de la passe).

## Objectif
Priorité absolue à la compréhension immédiate du gameplay pendant la partie.

## Changements
- Remplacement du feed secondaire dans le bloc live par un vrai panneau **À FAIRE MAINTENANT**.
- Consigne de cible dynamique selon chacune des 9 variantes CARGO.
- Bloc **GAIN / BONUS** indiquant ce que le joueur peut obtenir.
- Bloc **ATTENTION** indiquant le risque réel : surcharge, casse, expiration, perte de série, relais, etc.
- Résultat de la dernière volée : gain en kg/colis, MISS, perte, surcharge ou validation.
- Onboarding automatique avant la première volée : **1 VISE · 2 LANCE ×3 · 3 VALIDE**.
- Bande **OBJECTIF ACTUEL** renforcée sous le joueur actif.
- 3 points de fléchettes pour voir immédiatement combien de darts ont été saisies et quand la volée est prête à valider.
- Allègement des KPI live au profit des informations réellement utiles au gameplay.
- Responsive mobile/paysage ajusté sans augmenter la surface occupée par le Play.

## Fichiers modifiés
- `src/lib/gameEngines/cargoVisuals.ts`
- `src/components/cargo/CargoLoadStatus.tsx`
- `src/components/cargo/CargoManifestStrip.tsx`
- `src/styles/cargo-ui.css`

## Logique par variante
- Parcel Delivery : adresse à viser, prochain bonus, risque de rupture de chaîne.
- Exact Load : kg restants, zone critique et surcharge.
- Fragile Cargo : cible fragile, protection et risque de casse.
- Cargo Rush : contrat urgent, bonus et expiration.
- Full Pallet : progression, moment où la palette devient sécurisable et arbitrage risque/rendement.
- Free Load : segment actif, poids provisoire et risque de perte de série.
- Convoy : relais et transmission de série aux coéquipiers.
- Long Haul : cible de chargement, étape courante et prochaine étape.
- Cargo Classic : contrat recommandé, poids à gagner et risque de rupture de série.

## Note
Aucun moteur de score, sauvegarde, historique ou asset graphique n'est modifié dans cette passe.
