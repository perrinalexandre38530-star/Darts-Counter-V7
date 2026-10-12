-- ============================================================
-- MULTISPORTS SCORING — compte / profil multi-appareils
-- Active Supabase Realtime sur public.profiles afin qu'un changement
-- d'identité légère (pseudo, avatar, préférences, coordonnées) effectué sur
-- un appareil soit propagé immédiatement aux autres appareils connectés.
--
-- Idempotent : peut être rejoué sans erreur si la table est déjà publiée.
-- ============================================================

do $$
begin
  if to_regclass('public.profiles') is null then
    raise notice 'public.profiles absent : activation Realtime ignorée';
    return;
  end if;

  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    execute 'alter publication supabase_realtime add table public.profiles';
  end if;
end
$$;
