# MSS Agent — Campagne pubs Darts Scoring (V7(47))

## Livraison additive uniquement

Référence inspectée : `Darts-Counter-V7(47).zip`.

Ce lot ajoute uniquement un **pack de campagne publicitaire Darts Scoring** sous :

`tools/mss-social-content/campaigns/v47-darts-scoring-ads/`

Aucun module métier, aucun `package.json`, aucun composant de l'application n'est modifié.

## Contenu livré

### Visuels maîtres FR

- `assets/fr/MSS_DARTS_SCORING_CAMPAIGN_01_FR.png`
- `assets/fr/MSS_DARTS_SCORING_CAMPAIGN_02_FR.png`
- `assets/fr/MSS_DARTS_SCORING_CAMPAIGN_03_FR.png`

Ces 3 visuels correspondent aux trois affiches de campagne validées pour **Darts Scoring**.

### Traductions intégrées

22 langues de l'application sont prises en charge :

`fr, en, es, de, it, nl, pt, pl, ro, sr, hr, da, no, sv, is, cs, tr, ru, ar, hi, zh, ja`

Chaque fichier de `locales/<lang>.json` contient pour les 3 affiches :

- les titres,
- les accroches,
- les listes de fonctionnalités,
- les CTA,
- les libellés stores,
- les captions courtes,
- les hashtags.

Les visuels fournis ici sont des **masters français**. Pour les autres langues, les robots doivent utiliser les packs localisés afin de générer les déclinaisons textuelles avant diffusion, ou publier le master FR avec une caption localisée si la stratégie de diffusion l'accepte.

### Automatisation robots

- `automation/robots_payload.json` : manifeste principal pour diffusion automatisée.
- `automation/publication_matrix.json` : matrice simple d'usage par visuel / objectif.

## Manifest

Le fichier `manifest.json` fournit :

- le statut du lot,
- les hashes SHA-256 des 3 visuels FR,
- la liste des 22 langues,
- les chemins utiles,
- les objectifs de chaque campagne.

## Statut

**À valider avant publication.**

Le lot est prêt pour les robots de diffusion, mais il reste recommandé de :

1. vérifier visuellement les 3 masters FR ;
2. décider si chaque langue sera publiée avec image localisée ou master FR + caption localisée ;
3. valider les canaux réellement autorisés.
