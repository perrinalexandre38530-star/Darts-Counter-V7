# V27 — Envoi des notifications Web Push de la Boutique

Cette Edge Function n'est pas une API publique : seul le Cron Supabase l'appelle, avec un secret dans `x-shop-push-secret`. Elle utilise la clé privée VAPID et la clé **service role** **uniquement** côté serveur. Ne jamais ajouter ces deux clés dans les variables `VITE_*`, le code client ou le dépôt Git.

1. Appliquer V26 puis `20261109213000_organization_shop_web_push_v27.sql` dans Supabase.
2. Créer une paire de clés VAPID une seule fois, par exemple `npx --yes web-push generate-vapid-keys`. Conserver la clé privée hors Git.
3. Dans **Supabase Edge Function secrets**, configurer `SHOP_PUSH_VAPID_PUBLIC_KEY`, `SHOP_PUSH_VAPID_PRIVATE_KEY`, `SHOP_PUSH_VAPID_SUBJECT` (ex. `mailto:admin@votredomaine.tld`) et `SHOP_PUSH_CRON_SECRET` (valeur aléatoire d'au moins 32 octets). `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont des secrets serveur fournis/configurés par Supabase ; vérifier leur présence. Sur les projets à nouvelle clé, `SUPABASE_SECRET_KEY` est également accepté.
4. Déployer : `npx supabase functions deploy shop-push-dispatch --no-verify-jwt`. **La fonction impose elle-même le secret du Cron** ; n'envoyez pas ce secret depuis le frontend. `supabase/functions/shop-push-dispatch/deno.json` fixe les dépendances.
5. Dans les variables Cloudflare Pages (build frontend), définir `VITE_SHOP_PUSH_VAPID_PUBLIC_KEY` à la même clé publique. Recompiler et déployer le site.
6. Activer l'appel toutes les minutes via **Supabase Cron** / `pg_cron` + `pg_net`. Un exemple SQL est fourni ci-dessous. Conserver le secret en Vault.
7. Sur le site HTTPS, se connecter avec un compte `owner`, `admin` ou `manager`, ouvrir **Espace club → Boutique → Commandes & réservations → Voir les alertes**, puis cliquer **Activer les push Boutique (PWA)**. Tester avec une nouvelle demande publique pendant que la PWA est fermée.

### Exemple SQL Cron (configurer les secrets Vault avant)

```sql
-- Activer les extensions pg_cron et pg_net dans Supabase Dashboard > Database > Extensions.
-- Remplacer par VOS vraies valeurs. Exécuter UNIQUEMENT dans SQL Editor ;
-- ne pas enregistrer ces valeurs dans un fichier suivi par Git.
SELECT vault.create_secret('https://YOUR_PROJECT.supabase.co', 'mss_shop_push_project_url');
SELECT vault.create_secret('YOUR_RANDOM_CRON_SECRET', 'mss_shop_push_cron_secret');

SELECT cron.schedule('mss-shop-push-v27', '* * * * *', $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets
            WHERE name='mss_shop_push_project_url') || '/functions/v1/shop-push-dispatch',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-shop-push-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets
                              WHERE name='mss_shop_push_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
$$);
```

**Attention :** les clés de Vault peuvent apparaître brièvement dans la file HTTP `pg_net` jusqu'à l'envoi. Protéger les privilèges d'accès à cette file. Surveiller **Supabase → Cron → Historique**, puis **Edge Functions → Logs**.

### Limites

- Fonctionne pour la **PWA Web** (Chrome/Edge/Firefox/Safari compatibles) même si l'onglet est fermé, sous réserve des règles d'économie d'énergie du système et de disponibilité du service push. Ce n'est pas une garantie de livraison instantanée.
- L'application **Android native Capacitor** ne reçoit pas ces Web Push ; une intégration Firebase Cloud Messaging (FCM) est une étape distincte.
- Ne pousse que des alertes génériques **aux responsables**. Les clients sans compte continuent d'utiliser **Suivre ma demande** (référence + e-mail), sans souscription anonyme potentiellement détournable.
- Aucune alerte rétrospective à l'installation : seules les notifications créées après souscription sont envoyées. Les événements expirent après 72 h, tentatives limitées à 6.
- En cas de clé VAPID différente de celle déjà utilisée pour la messagerie du navigateur, l'inscription est refusée pour ne pas casser les notifications des appels/messages existants. Harmoniser les clés côté serveur avant activation.
- Tous les tests sur le système Supabase distant et appareils réels restent à faire avant activation générale.
