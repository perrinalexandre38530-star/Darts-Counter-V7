-- MULTISPORTS SCORING — V137
-- PostgREST PGRST002 : verrouillage NON DESTRUCTIF des chemins de schema
--
-- Ce script ne modifie AUCUNE table, AUCUNE ligne, AUCUN profil, AUCUN compte,
-- AUCUN avatar, AUCUNE policy RLS et AUCUNE donnée utilisateur.
-- Il agit uniquement sur la configuration PostgREST du rôle authenticator.

-- 0) Diagnostic avant correction
select
  now() as checked_at,
  current_database() as database_name,
  (select rolconfig from pg_roles where rolname = 'authenticator') as authenticator_before,
  to_regnamespace('public') is not null as public_exists,
  to_regnamespace('extensions') is not null as extensions_exists,
  to_regnamespace('graphql_public') is not null as graphql_public_exists,
  pg_notification_queue_usage() as notification_queue_usage_before;

-- 1) Garde-fou absolu : public doit exister.
do $$
begin
  if to_regnamespace('public') is null then
    raise exception 'V137 ARRET : schema public introuvable. Aucune modification appliquee.';
  end if;
end $$;

-- 2) Le Data API de MULTISPORTS SCORING utilise public.
--    Ce réglage manuel devient l'autorité pour db_schemas.
alter role authenticator set pgrst.db_schemas = 'public';

-- 3) IMPORTANT V137 : PostgREST 13 valide AUSSI db-extra-search-path.
--    On enlève donc tout ancien schema fantôme de ce chemin et on conserve
--    uniquement les schemas réellement présents et nécessaires.
do $$
begin
  if to_regnamespace('extensions') is not null then
    execute 'alter role authenticator set pgrst.db_extra_search_path = ''public, extensions''';
  else
    execute 'alter role authenticator set pgrst.db_extra_search_path = ''public''';
  end if;
end $$;

-- 4) Réveille la file de notifications puis recharge config + schema cache.
select pg_notification_queue_usage();
notify pgrst, 'reload config';
notify pgrst, 'reload schema';

-- 5) Diagnostic après correction : les deux réglages doivent apparaître ici.
select
  now() as checked_at,
  (select rolconfig from pg_roles where rolname = 'authenticator') as authenticator_after,
  array(
    select nspname
    from pg_namespace
    where nspname in ('public', 'extensions', 'graphql_public')
    order by nspname
  ) as relevant_existing_schemas,
  pg_notification_queue_usage() as notification_queue_usage_after;
