-- Seviyummy production schema
-- Run this once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.artworks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  image_path text not null,
  tags text[] not null default '{}',
  hidden_tags text[] not null default '{}',
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists artworks_public_created_at_idx
  on public.artworks (is_public, created_at desc);

alter table public.artworks enable row level security;

revoke select on public.artworks from anon;
grant select, insert, update, delete on public.artworks to authenticated;

drop policy if exists "Public can view published artworks" on public.artworks;
create policy "Public can view published artworks"
  on public.artworks for select
  to anon, authenticated
  using (is_public = true or (select auth.uid()) = owner_id);

drop policy if exists "Owners can create artworks" on public.artworks;
create policy "Owners can create artworks"
  on public.artworks for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Owners can update artworks" on public.artworks;
create policy "Owners can update artworks"
  on public.artworks for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Owners can delete artworks" on public.artworks;
create policy "Owners can delete artworks"
  on public.artworks for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

-- The private schema must stay out of Supabase's exposed API schemas.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

-- Search hidden tags internally, but return only fields safe for the public gallery.
create or replace function private._search_public_artworks(p_query text default '')
returns table (
  id uuid,
  title text,
  image_path text,
  tags text[]
)
language sql
stable
security definer
set search_path = ''
as $function$
  with search_term as (
    select pg_catalog.lower(pg_catalog.btrim(coalesce(p_query, ''))) as value
  )
  select artwork.id, artwork.title, artwork.image_path, artwork.tags
  from public.artworks as artwork
  cross join search_term
  where artwork.is_public is true
    and (
      search_term.value = ''
      or pg_catalog.strpos(pg_catalog.lower(artwork.title), search_term.value) > 0
      or exists (
        select 1
        from pg_catalog.unnest(coalesce(artwork.tags, array[]::text[])) as visible_tag(value)
        where pg_catalog.strpos(pg_catalog.lower(visible_tag.value), search_term.value) > 0
      )
      or exists (
        select 1
        from pg_catalog.unnest(coalesce(artwork.hidden_tags, array[]::text[])) as hidden_tag(value)
        where pg_catalog.strpos(pg_catalog.lower(hidden_tag.value), search_term.value) > 0
      )
    )
  order by artwork.created_at desc
  limit 1000;
$function$;

revoke all on function private._search_public_artworks(text) from public;
revoke all on function private._search_public_artworks(text) from anon, authenticated;
grant execute on function private._search_public_artworks(text) to anon, authenticated;

create or replace function public.search_public_artworks(p_query text default '')
returns table (
  id uuid,
  title text,
  image_path text,
  tags text[]
)
language sql
stable
security invoker
set search_path = ''
as $function$
  select * from private._search_public_artworks(p_query);
$function$;

revoke all on function public.search_public_artworks(text) from public;
revoke all on function public.search_public_artworks(text) from anon, authenticated;
grant execute on function public.search_public_artworks(text) to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('artworks', 'artworks', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public can view artwork files" on storage.objects;
create policy "Public can view artwork files"
  on storage.objects for select
  to public
  using (bucket_id = 'artworks');

drop policy if exists "Owners can upload artwork files" on storage.objects;
create policy "Owners can upload artwork files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'artworks' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Owners can update artwork files" on storage.objects;
create policy "Owners can update artwork files"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'artworks' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'artworks' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Owners can delete artwork files" on storage.objects;
create policy "Owners can delete artwork files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'artworks' and (storage.foldername(name))[1] = (select auth.uid()::text));
