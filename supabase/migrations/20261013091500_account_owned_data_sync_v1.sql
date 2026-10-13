-- ============================================================
-- MULTISPORTS SCORING — données privées du compte multi-appareils V1
-- Profils locaux / Galerie / BOTS CPU / Teams / état Stats + History.
-- Les médias lourds restent dans le coffre média R2/Storage existant.
-- Cette table ne contient que des documents JSON privés appartenant au compte.
-- ============================================================

create table if not exists public.account_sync_documents (
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null,
  document_id text not null default 'default',
  payload jsonb not null default '{}'::jsonb,
  client_updated_at bigint not null default 0,
  deleted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_user_id, document_type, document_id),
  constraint account_sync_documents_type_len check (char_length(document_type) between 1 and 64),
  constraint account_sync_documents_id_len check (char_length(document_id) between 1 and 180)
);

create index if not exists account_sync_documents_owner_type_idx
  on public.account_sync_documents(owner_user_id, document_type, updated_at desc);

alter table public.account_sync_documents enable row level security;

-- PostgREST : seuls les utilisateurs authentifiés peuvent toucher la table.
-- Les policies RLS ci-dessous imposent ensuite owner_user_id = auth.uid().
revoke all on table public.account_sync_documents from anon;
grant select, insert, update, delete on table public.account_sync_documents to authenticated;

-- Trigger updated_at local à cette table (idempotent).
create or replace function public.mss_touch_account_sync_document()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_mss_touch_account_sync_document on public.account_sync_documents;
create trigger trg_mss_touch_account_sync_document
before update on public.account_sync_documents
for each row execute function public.mss_touch_account_sync_document();

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='account_sync_documents'
      and policyname='account_sync_documents_select_own'
  ) then
    create policy account_sync_documents_select_own
      on public.account_sync_documents for select to authenticated
      using (owner_user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='account_sync_documents'
      and policyname='account_sync_documents_insert_own'
  ) then
    create policy account_sync_documents_insert_own
      on public.account_sync_documents for insert to authenticated
      with check (owner_user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='account_sync_documents'
      and policyname='account_sync_documents_update_own'
  ) then
    create policy account_sync_documents_update_own
      on public.account_sync_documents for update to authenticated
      using (owner_user_id = auth.uid())
      with check (owner_user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='account_sync_documents'
      and policyname='account_sync_documents_delete_own'
  ) then
    create policy account_sync_documents_delete_own
      on public.account_sync_documents for delete to authenticated
      using (owner_user_id = auth.uid());
  end if;
end $$;

-- Realtime : propagations entre appareils connectés au même compte.
do $$
begin
  if exists (select 1 from pg_publication where pubname='supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname='supabase_realtime'
         and schemaname='public'
         and tablename='account_sync_documents'
     ) then
    alter publication supabase_realtime add table public.account_sync_documents;
  end if;
end $$;
