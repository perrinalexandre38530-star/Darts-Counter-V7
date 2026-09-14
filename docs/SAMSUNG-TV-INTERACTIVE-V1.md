# MULTISPORTS SCORING — Samsung TV Interactive V1

## Audit du point de départ

Le Viewer Samsung existant savait déjà :

- créer/rejoindre une session par code 6 caractères ;
- stocker le snapshot live dans `DC_SYNC` ;
- afficher un scoreboard quand un snapshot arrivait ;
- utiliser un `RoomDO` déclaré dans Wrangler.

Mais quatre limites expliquaient le comportement observé sur la TV :

1. **Le Viewer TV était passif** : après connexion il ne disposait d'aucun menu ni d'un état de navigation du téléphone.
2. **Le `RoomDO` n'était pas utilisé par le Viewer** : il existait dans Wrangler mais la session Viewer reposait uniquement sur du polling HTTP/KV.
3. **Le pont partie -> Viewer était couplé à `googleCast.ts`** et passait par un import dynamique après sanitation du payload Cast. Le Viewer devait être indépendant de Google Cast.
4. **Aucun canal bidirectionnel n'existait** pour transmettre `navigation_state` du téléphone vers la TV ou `navigate` de la télécommande vers le téléphone.

## Architecture V1

```text
                     dc-online-v3
                          |
              +-----------+-----------+
              |                       |
         Durable Object             DC_SYNC
       WebSocket temps réel       fallback / reprise
              |                       |
      +-------+-------+               |
      |               |               |
  Téléphone       Samsung TV <--------+
      |               |
 navigation        menu TV
 snapshots         télécommande
      |               |
      +------- état partagé ----------+
```

## Ce que fait le patch

### Téléphone

- Maintient une connexion WebSocket liée à la session Viewer active.
- Publie le changement de page (`navigation_state`) à la TV.
- Accepte une commande de navigation venant de la télécommande Samsung sur les écrans autorisés.
- N'autorise pas la TV à arracher le téléphone à un écran de partie en cours.
- Tous les modes qui utilisent déjà `sendCastSnapshot()` publient désormais leur snapshot Viewer **avant** toute dépendance au SDK Google Cast.
- Le snapshot est envoyé en double transport :
  - WebSocket pour l'instantanéité ;
  - HTTP/KV `DC_SYNC` comme source de vérité et fallback.

### Samsung TV

Après saisie du code, la TV affiche désormais un **vrai accueil MULTISPORTS SCORING TV** :

- Partie en cours
- Jeux
- Profils
- Online
- Stats
- Agenda
- Réglages

La télécommande permet de naviguer avec les flèches et `OK`.

- Hors partie, choisir une rubrique sur la TV pilote la navigation du téléphone.
- Naviguer sur le téléphone met à jour l'état affiché sur la TV.
- Quand un snapshot de partie arrive, la TV bascule automatiquement sur le scoreboard live.
- `Retour` pendant le scoreboard ramène au menu TV sans interrompre la partie du téléphone.

## Important : ce n'est pas du mirroring vidéo

Cette V1 synchronise **l'état et la navigation**, pas les pixels du téléphone. C'est volontaire :

- meilleure lisibilité grand écran ;
- vraie navigation télécommande ;
- moins de latence ;
- pas de capture vidéo Android ;
- pas de permission de contrôle d'écran intrusive.

Le principe est : **même session et mêmes données, interface adaptée à chaque écran**.

## Vérification

```powershell
npm run test:viewer:samsung
npm run test:viewer:samsung:interactive
npm run deploy:online
npm run tv:samsung:build
npm run tv:samsung:check
```

Puis :

1. Sur le téléphone : `Réglages > Écrans > VIEWER > Créer session`.
2. Saisir le code 6 caractères sur la Samsung TV.
3. Vérifier que le menu TV apparaît et que l'indicateur affiche `TÉLÉPHONE CONNECTÉ`.
4. Depuis la TV, ouvrir `STATS` ou `PROFILS` : le téléphone doit suivre hors partie.
5. Sur le téléphone, revenir dans `JEUX` : la TV doit afficher `Jeux` comme écran courant.
6. Lancer X01 et saisir un score : la TV doit basculer automatiquement sur le scoreboard.
7. Appuyer sur `Retour` sur la télécommande : la TV revient au menu sans quitter X01 sur le téléphone.

## Étape suivante après validation terrain

Étendre les vues TV dédiées à davantage de pages (profils, classements, organisations, agenda) et enrichir les commandes TV sans jamais rendre la partie mobile dépendante de la TV.
