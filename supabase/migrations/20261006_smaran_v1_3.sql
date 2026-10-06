-- Smaran v1.3.0 database upgrade / repair
-- Run THIS migration in the Supabase SQL Editor for an existing Smaran project.
-- It is intentionally collision-resistant: v1.2 used generic helper/RPC names that
-- could conflict with older overloaded functions. v1.3 uses smaran_* names instead.
--
-- Safe approach:
--   1) Add missing columns/tables from earlier Smaran versions.
--   2) Replace only Smaran policies on these tables.
--   3) Create uniquely-named helper/RPC functions.
--   4) Re-enable Realtime on the collaboration tables.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Tables + columns (idempotent upgrades)
-- -----------------------------------------------------------------------------
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'member',
  created_at timestamptz not null default now()
);

create unique index if not exists smaran_group_members_group_user_uidx
  on public.group_members(group_id, user_id);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null,
  description text,
  location text,
  resource_url text,
  start_time timestamptz not null,
  urgency_tier text not null default 'WARNING',
  warning_minutes integer[] not null default array[180,60],
  recurrence_rule text,
  status text not null default 'active',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.events add column if not exists location text;
alter table public.events add column if not exists resource_url text;
alter table public.events add column if not exists warning_minutes integer[] not null default array[180,60];
alter table public.events add column if not exists recurrence_rule text;
alter table public.events add column if not exists status text not null default 'active';
alter table public.events add column if not exists updated_at timestamptz not null default now();

create table if not exists public.event_acknowledgments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  acknowledged_at timestamptz not null default now()
);
create unique index if not exists smaran_event_acks_event_user_uidx
  on public.event_acknowledgments(event_id, user_id);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  expiration_time bigint,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  delivered_at timestamptz not null default now()
);
create unique index if not exists smaran_notification_deliveries_uidx
  on public.notification_deliveries(event_id, user_id, kind);

-- Normalize/guard constraints where older installs may have omitted them.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'smaran_group_members_role_check') then
    alter table public.group_members
      add constraint smaran_group_members_role_check check (role in ('owner','admin','member'));
  end if;
exception when duplicate_object then null;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'smaran_events_urgency_check') then
    alter table public.events
      add constraint smaran_events_urgency_check check (urgency_tier in ('INFO','WARNING','LOUD'));
  end if;
exception when duplicate_object then null;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'smaran_events_status_check') then
    alter table public.events
      add constraint smaran_events_status_check check (status in ('active','completed','cancelled'));
  end if;
exception when duplicate_object then null;
end $$;

create index if not exists smaran_groups_created_by_idx on public.groups(created_by);
create index if not exists smaran_group_members_user_id_idx on public.group_members(user_id);
create index if not exists smaran_group_members_group_id_idx on public.group_members(group_id);
create index if not exists smaran_events_group_start_idx on public.events(group_id, start_time);
create index if not exists smaran_events_status_start_idx on public.events(status, start_time);
create index if not exists smaran_event_acks_event_id_idx on public.event_acknowledgments(event_id);
create index if not exists smaran_event_acks_user_id_idx on public.event_acknowledgments(user_id);
create index if not exists smaran_push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

-- -----------------------------------------------------------------------------
-- Timestamp trigger
-- -----------------------------------------------------------------------------
create or replace function public.smaran_touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists smaran_events_touch_updated_at on public.events;
create trigger smaran_events_touch_updated_at
before update on public.events
for each row execute function public.smaran_touch_updated_at();

-- -----------------------------------------------------------------------------
-- Remove only policies currently associated with these Smaran tables.
-- This is deliberate: older policy names and definitions differed between builds.
-- -----------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('groups','group_members','events','event_acknowledgments','push_subscriptions','notification_deliveries')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Collision-resistant security helpers.
-- IMPORTANT: we intentionally do NOT create/replace public.is_group_member(...)
-- because v1.0/v1.1/v1.2 installs can contain overloaded versions of that name.
-- -----------------------------------------------------------------------------
create or replace function public.smaran_is_group_member(p_group_id uuid)
returns boolean
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = auth.uid()
  );
$$;

create or replace function public.smaran_is_group_admin(p_group_id uuid)
returns boolean
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = auth.uid()
      and gm.role in ('owner','admin')
  );
$$;

-- -----------------------------------------------------------------------------
-- Collision-resistant user mutations.
-- -----------------------------------------------------------------------------
drop function if exists public.smaran_create_group(text,text);
create function public.smaran_create_group(group_name text, owner_display_name text)
returns public.groups
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller uuid := auth.uid();
  new_code text;
  new_group public.groups;
  clean_name text := btrim(group_name);
  clean_display text := btrim(owner_display_name);
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if char_length(clean_name) < 2 then raise exception 'Group name must be at least 2 characters'; end if;
  if char_length(clean_name) > 70 then raise exception 'Group name is too long'; end if;
  if char_length(clean_display) < 1 then clean_display := 'Owner'; end if;
  if char_length(clean_display) > 40 then clean_display := left(clean_display, 40); end if;

  loop
    select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random() * 32)::int + 1, 1), '')
      into new_code
    from generate_series(1,6);
    exit when not exists (select 1 from public.groups where code = new_code);
  end loop;

  insert into public.groups(name, code, created_by)
  values (clean_name, new_code, caller)
  returning * into new_group;

  insert into public.group_members(group_id, user_id, display_name, role)
  values (new_group.id, caller, clean_display, 'owner');

  return new_group;
end;
$$;

create or replace function public.smaran_join_group(join_code text, member_display_name text)
returns public.group_members
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller uuid := auth.uid();
  target public.groups;
  member public.group_members;
  clean_display text := btrim(member_display_name);
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if char_length(clean_display) < 1 then raise exception 'Display name is required'; end if;
  if char_length(clean_display) > 40 then clean_display := left(clean_display, 40); end if;

  select * into target from public.groups where code = upper(btrim(join_code));
  if target.id is null then raise exception 'Group not found'; end if;

  insert into public.group_members(group_id, user_id, display_name, role)
  values (target.id, caller, clean_display, 'member')
  on conflict (group_id, user_id)
  do update set display_name = excluded.display_name
  returning * into member;

  return member;
end;
$$;

create or replace function public.smaran_claim_due_loud_notifications(window_start timestamptz, window_end timestamptz)
returns table(event_id uuid, user_id uuid, title text, group_id uuid, start_time timestamptz)
language sql
security definer
set search_path = pg_catalog, public
as $$
with candidates as (
  select e.id as event_id, gm.user_id, e.title, e.group_id, e.start_time
  from public.events e
  join public.group_members gm on gm.group_id = e.group_id
  where e.urgency_tier = 'LOUD'
    and e.status = 'active'
    and e.start_time > window_start
    and e.start_time <= window_end
), claimed as (
  insert into public.notification_deliveries(event_id,user_id,kind)
  select event_id,user_id,'LOUD'
  from candidates
  on conflict (event_id,user_id,kind) do nothing
  returning event_id,user_id
)
select c.event_id,c.user_id,c.title,c.group_id,c.start_time
from candidates c
join claimed cl on cl.event_id=c.event_id and cl.user_id=c.user_id;
$$;

revoke all on function public.smaran_is_group_member(uuid) from public;
revoke all on function public.smaran_is_group_admin(uuid) from public;
revoke all on function public.smaran_create_group(text,text) from public;
revoke all on function public.smaran_join_group(text,text) from public;
revoke all on function public.smaran_claim_due_loud_notifications(timestamptz,timestamptz) from public;

grant execute on function public.smaran_is_group_member(uuid) to authenticated;
grant execute on function public.smaran_is_group_admin(uuid) to authenticated;
grant execute on function public.smaran_create_group(text,text) to authenticated;
grant execute on function public.smaran_join_group(text,text) to authenticated;
grant execute on function public.smaran_claim_due_loud_notifications(timestamptz,timestamptz) to service_role;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.events enable row level security;
alter table public.event_acknowledgments enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_deliveries enable row level security;

create policy smaran_groups_select_member
on public.groups for select to authenticated
using (public.smaran_is_group_member(id));

create policy smaran_members_select_member
on public.group_members for select to authenticated
using (public.smaran_is_group_member(group_id));

create policy smaran_events_select_member
on public.events for select to authenticated
using (public.smaran_is_group_member(group_id));

create policy smaran_events_insert_member
on public.events for insert to authenticated
with check (created_by = auth.uid() and public.smaran_is_group_member(group_id));

create policy smaran_events_update_creator_admin
on public.events for update to authenticated
using (created_by = auth.uid() or public.smaran_is_group_admin(group_id))
with check (created_by = auth.uid() or public.smaran_is_group_admin(group_id));

create policy smaran_events_delete_creator_admin
on public.events for delete to authenticated
using (created_by = auth.uid() or public.smaran_is_group_admin(group_id));

create policy smaran_acks_select_member
on public.event_acknowledgments for select to authenticated
using (
  exists (
    select 1 from public.events e
    where e.id = event_id
      and public.smaran_is_group_member(e.group_id)
  )
);

create policy smaran_acks_insert_self
on public.event_acknowledgments for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.events e
    where e.id = event_id
      and public.smaran_is_group_member(e.group_id)
  )
);

create policy smaran_acks_update_self
on public.event_acknowledgments for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy smaran_acks_delete_self
on public.event_acknowledgments for delete to authenticated
using (user_id = auth.uid());

create policy smaran_push_select_self
on public.push_subscriptions for select to authenticated
using (user_id = auth.uid());

create policy smaran_push_insert_self
on public.push_subscriptions for insert to authenticated
with check (user_id = auth.uid());

create policy smaran_push_update_self
on public.push_subscriptions for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy smaran_push_delete_self
on public.push_subscriptions for delete to authenticated
using (user_id = auth.uid());

-- notification_deliveries intentionally has no authenticated policies.
-- It is an internal service-role ledger.

-- -----------------------------------------------------------------------------
-- Realtime
-- -----------------------------------------------------------------------------
alter table public.events replica identity full;
alter table public.event_acknowledgments replica identity full;
alter table public.group_members replica identity full;

do $$ begin
  alter publication supabase_realtime add table public.events;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.event_acknowledgments;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.group_members;
exception when duplicate_object then null;
end $$;

-- Verification query:
-- select routine_name, specific_name from information_schema.routines
-- where routine_schema='public' and routine_name like 'smaran_%';
