# Stockage MULTISPORTS SCORING — NAS rapide + R2 PREMIUM

## Politique appliquée

- **Local / fichier / HDD / USB / carte SD / dossier cloud personnel** : gratuits, sans appel R2.
- **NAS fondateur** : sauvegarde complète compressée côté navigateur avant `/sync/push`, avec timeout court et copie locale de sécurité.
- **Cloudflare R2** : **0 octet d’écriture gratuite**. Toute nouvelle écriture (snapshot, avatar fallback, média fallback) est refusée en HTTP 402 tant qu’un abonnement stockage payant n’est pas `active` ou `trialing`.
- **Compte fondateur compris** : le statut fondateur donne accès au NAS privé mais ne donne aucun passe-droit R2 gratuit ; R2 exige lui aussi une offre PREMIUM active.
- Lecture/restauration/suppression d’anciens objets R2 : reste disponible pour ne pas prendre les données en otage.
- Les sauvegardes automatiques R2 ne sont actives que lorsque la destination choisie est R2 **et** que le droit PREMIUM est actif.
- Rétention des snapshots R2 : génération courante + précédente.

## Cloudflare Pages à configurer

Binding R2 : `USER_DATA_BUCKET` -> `multisports-user-data`.

Secrets/variables Functions :

```text
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET_STORAGE
STRIPE_PRICE_STORAGE_STARTER_MONTHLY
STRIPE_PRICE_STORAGE_STARTER_YEARLY
STRIPE_PRICE_STORAGE_PLAYER_MONTHLY
STRIPE_PRICE_STORAGE_PLAYER_YEARLY
STRIPE_PRICE_STORAGE_PLUS_MONTHLY
STRIPE_PRICE_STORAGE_PLUS_YEARLY
STRIPE_PRICE_STORAGE_PRO_MONTHLY
STRIPE_PRICE_STORAGE_PRO_YEARLY
STRIPE_PRICE_STORAGE_CLUB_MONTHLY
STRIPE_PRICE_STORAGE_CLUB_YEARLY
STRIPE_PRICE_STORAGE_TITAN_MONTHLY
STRIPE_PRICE_STORAGE_TITAN_YEARLY
```

Webhook Stripe :

```text
https://<domaine-pages>/api/storage/backups/billing/webhook
```

Événements : `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.

## Important pour le NAS

Le frontend et `server.js` doivent être déployés ensemble. Le frontend envoie maintenant un wrapper `gzip+store-v2`; le backend le décompresse avant de stocker le snapshot. Cela évite d’envoyer le gros JSON brut qui provoquait `Payload Too Large`.

Le backend renvoie aussi une erreur JSON propre en cas de 413 au lieu d’une page HTML.
