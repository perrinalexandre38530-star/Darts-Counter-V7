# V109 — THÈME FULLSCREEN + APERÇU ACCUEIL

Fichier remplacé : `src/pages/Settings.tsx`

Cette version remplace V108 : ne pas appliquer V108 avant V109.

- conserve toute la compaction V108 de la page THÈME ;
- retire le sous-titre `Choisissez votre ambiance` ;
- retire le bloc redondant `THÈME ACTIF` ;
- retire le bouton redondant `OUVRIR LE PACK SÉLECTIONNÉ` ;
- réduit marges, cartes, preview, carrousels et boutons pour limiter le scroll ;
- remplace l'ancien faux aperçu X01 par une miniature fidèle de la page ACCUEIL :
  - bloc BIENVENUE / DARTS SCORING ;
  - carte joueur actif ;
  - vue globale et KPIs ;
  - ticker Records / X01 / Online / Training ;
  - cartes Records X01 et Astuce ;
- les textures, fonds, bordures, accents et effets du thème sélectionné sont appliqués directement à cet aperçu Accueil.
