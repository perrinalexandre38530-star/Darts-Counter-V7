# AWENA PREMIUM MOTION — FIT PERF

Ce dossier est le point d'entrée unique des animations premium AWENA.

## Priorité de lecture dans l'application

1. **Vidéo premium** WebM / MP4 déclarée dans `src/fit/awenaPremiumMotions.ts`.
2. **Séquence de frames WebP** déclarée dans le même registre.
3. **Renderer procédural AWENA** existant si aucun média premium n'est encore disponible.

L'interface FIT PERF ne doit pas être modifiée pour ajouter un nouvel exercice premium.

## Convention recommandée par exercice

```text
public/fit/motions/awena/premium/<exercise-id>/
├── poster.webp
├── motion.webm          # recommandé : boucle premium, VP9/WebM
├── motion.mp4           # fallback vidéo facultatif
└── frames/
    ├── frame-01.webp
    ├── frame-02.webp
    ├── ...
    └── frame-XX.webp
```

## Frames

- fond transparent ;
- cadrage strictement identique entre toutes les frames ;
- AWENA à la même échelle ;
- 512 à 768 px par frame suffit pour l'affichage FIT PERF actuel ;
- 12 à 24 fps recommandé pour une vraie animation finale ;
- WebP avec alpha recommandé ;
- le registre accepte un `order` personnalisé si le mouvement doit être lu dans un ordre particulier.

## Vidéo

Quand une vraie boucle 3D est disponible, ajouter par exemple dans le slot de l'exercice :

```ts
video: {
  poster: "/fit/motions/awena/premium/squat/poster.webp",
  sources: [
    { src: "/fit/motions/awena/premium/squat/motion.webm", type: "video/webm" },
    { src: "/fit/motions/awena/premium/squat/motion.mp4", type: "video/mp4" },
  ],
},
```

La vidéo devient automatiquement prioritaire. Si elle échoue, les frames restent le filet de sécurité.

## Optimisation déjà intégrée

- animation seulement quand la démonstration est visible ;
- pause automatique lorsque l'onglet navigateur est masqué ;
- respect de `prefers-reduced-motion` ;
- les cartes compactes restent sur une preview statique ;
- préchargement des frames seulement pour la démonstration détaillée ;
- aucune recherche réseau sur des fichiers inexistants : seuls les médias enregistrés sont chargés.

## Slots déjà prêts

`bench`, `incline-db`, `cable-fly`, `pullup`, `row`, `lat-pulldown`, `ohp`, `lateral-raise`, `curl`, `triceps-push`, `squat`, `leg-press`, `rdl`, `hip-thrust`, `calf`, `plank`, `deadlift`, `goblet`.

Les premiers keyframes premium fournis dans ce patch sont installés pour : **squat, développé couché, deadlift, curl biceps et tractions**. Ils peuvent être remplacés sans toucher à l'UI lorsque les séquences 12–24 frames ou les vidéos 3D finales seront disponibles.
