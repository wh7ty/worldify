create extension if not exists pgcrypto;

create table if not exists public.universes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entities (
  id uuid primary key default gen_random_uuid(),
  universe_id uuid not null references public.universes(id) on delete cascade,
  type text not null check (
    type in (
      'character',
      'location',
      'faction',
      'magic_system',
      'creature',
      'language',
      'item',
      'story',
      'event',
      'note'
    )
  ),
  name text not null,
  short_description text,
  content text,
  tags text[] not null default '{}',
  status text not null default 'draft' check (
    status in ('draft', 'active', 'archived', 'concept')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists universes_user_id_idx on public.universes(user_id);
create index if not exists entities_universe_id_idx on public.entities(universe_id);
create index if not exists entities_type_idx on public.entities(type);
create index if not exists entities_status_idx on public.entities(status);

alter table public.universes enable row level security;
alter table public.entities enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.universes to authenticated;
grant select, insert, update, delete on public.entities to authenticated;

drop policy if exists "users can read own universes" on public.universes;
create policy "users can read own universes"
on public.universes
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "users can insert own universes" on public.universes;
create policy "users can insert own universes"
on public.universes
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "users can update own universes" on public.universes;
create policy "users can update own universes"
on public.universes
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "users can delete own universes" on public.universes;
create policy "users can delete own universes"
on public.universes
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "users can read own entities" on public.entities;
create policy "users can read own entities"
on public.entities
for select
to authenticated
using (
  exists (
    select 1
    from public.universes
    where public.universes.id = public.entities.universe_id
      and public.universes.user_id = (select auth.uid())
  )
);

drop policy if exists "users can insert own entities" on public.entities;
create policy "users can insert own entities"
on public.entities
for insert
to authenticated
with check (
  exists (
    select 1
    from public.universes
    where public.universes.id = public.entities.universe_id
      and public.universes.user_id = (select auth.uid())
  )
);

drop policy if exists "users can update own entities" on public.entities;
create policy "users can update own entities"
on public.entities
for update
to authenticated
using (
  exists (
    select 1
    from public.universes
    where public.universes.id = public.entities.universe_id
      and public.universes.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.universes
    where public.universes.id = public.entities.universe_id
      and public.universes.user_id = (select auth.uid())
  )
);

drop policy if exists "users can delete own entities" on public.entities;
create policy "users can delete own entities"
on public.entities
for delete
to authenticated
using (
  exists (
    select 1
    from public.universes
    where public.universes.id = public.entities.universe_id
      and public.universes.user_id = (select auth.uid())
  )
);
