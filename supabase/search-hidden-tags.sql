-- Run once on an existing Seviyummy project to enable public search by hidden tags.
-- Hidden tag values are read only inside this function and are never returned by the API.

revoke select on public.artworks from anon;

-- Keep this schema out of Supabase's exposed API schemas.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

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
