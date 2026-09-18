# ONLINE PUBLIC — Stabilisation V2

## Objectif

Le mode ONLINE public n'utilise plus le NAS personnel comme transport de salons, chat ou match live. La source de vérité est Supabase : `online_lobbies`, `online_lobby_players`, `online_matches`, `online_messages` + Realtime.

## Ce patch finalise le socle X01 public

- création et jonction de salon atomiques via RPC SQL ;
- capacité du salon contrôlée côté serveur ;
- READY contrôlé côté serveur ;
- démarrage réservé à l'hôte et refusé tant qu'un invité n'est pas prêt ;
- présence `online / away / offline` avec heartbeat et expiration visuelle après 2 minutes ;
- transfert automatique de l'hôte si celui-ci quitte un salon en attente ;
- chat public Supabase + Realtime uniquement ;
- état du match X01 public dans `online_matches` avec compteur `revision` ;
- Realtime pour salon, participants, messages et match, avec polling de secours ;
- suppression du vieux WebSocket Worker de l'écran `X01OnlineSetup` afin d'éviter deux états concurrents ;
- conservation du NAS pour les usages privés déjà prévus (compte fondateur/sauvegardes), sans dépendance pour jouer en public.

## Déploiement obligatoire

1. Appliquer `supabase/migrations/20260918225000_online_public_stabilization_v2.sql` sur le projet Supabase de production.
2. Déployer ensuite le front Web/Android contenant ce patch.
3. Tester avec deux comptes distincts : création → rejoindre → READY → chat → lancement X01 → une volée sur chaque appareil → fin de partie → retour ONLINE.

Le client conserve des fallbacks vers le schéma V1 lorsque les RPC V2 n'existent pas encore, mais les garanties atomiques et la présence nécessitent la migration V2.

## Contrôle local

`npm run test:online-v2`
