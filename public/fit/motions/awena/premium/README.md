# AWENA PREMIUM MOTION — FIT PERF

Ce dossier est le point d'entrée unique des animations premium AWENA.

## Priorité de lecture dans l'application

1. **Vidéo premium** WebM / MP4 déclarée dans `src/fit/awenaPremiumMotions.ts`.
2. **Séquence de frames WebP** déclarée dans le même registre.
3. **Renderer AWENA 3D** (vraie mocap BVH lorsqu'elle existe, sinon 3D procédurale).
4. **Renderer procédural AWENA 2D** comme dernier filet de sécurité.

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

Dans le ZIP V82 actuel, les séquences WebP réellement présentes et déclarées sont : **développé couché** et **curl biceps**. Les autres slots restent volontairement vides jusqu'à ce que leurs médias existent réellement ; ils passent alors vers la 3D/mocap sans requêtes 404 inutiles.
