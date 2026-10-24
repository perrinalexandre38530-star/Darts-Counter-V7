-- MULTISPORTS SCORING — V138
-- RECOVERY PostgREST PGRST002 : schema-cache timeout
--
-- A exécuter dans Supabase > SQL Editor.
-- NON DESTRUCTIF : aucune table, ligne, policy, profil, compte ou avatar n'est modifié.
--
-- Constat V137 :
--   - public existe
--   - extensions existe
--   - graphql_public existe
--   - la file de notifications n'est pas bloquée
--   - authenticator a statement_timeout=8s
--
-- But V138 :
--   donner au rôle de connexion PostgREST assez de temps pour construire son schema cache,
--   puis forcer le rechargement de la configuration et du cache.

-- 1) Etat avant
select
  now() as checked_at,
  (select rolconfig from pg_roles where rolname = 'authenticator') as authenticator_before,
  (
    select count(*)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public','graphql_public')
      and c.relkind in ('r','p','v','m','f')
  ) as api_relations,
  (
    select count(*)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public','graphql_public')
  ) as api_functions,
  pg_notification_queue_usage() as notification_queue_usage_before;

-- 2) Le chargement du schema cache PostgREST se fait via authenticator.
--    8 secondes peut être insuffisant sur un schema devenu conséquent.
alter role authenticator set statement_timeout = '60s';

-- 3) Recharge PostgREST.
select pg_notification_queue_usage();
notify pgrst, 'reload config';
notify pgrst, 'reload schema';

-- 4) Etat après
select
  now() as checked_at,
  (select rolconfig from pg_roles where rolname = 'authenticator') as authenticator_after,
  pg_notification_queue_usage() as notification_queue_usage_after;

-- ROLLBACK MANUEL (NE PAS EXECUTER sauf si on veut explicitement revenir à 8s) :
-- alter role authenticator set statement_timeout = '8s';
-- notify pgrst, 'reload config';
-- notify pgrst, 'reload schema';
