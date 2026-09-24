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

grant select on public.artworks to anon;
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
