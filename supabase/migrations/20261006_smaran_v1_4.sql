-- Smaran v1.4 notification engine
-- Safe to run after the previous Smaran migrations.

create or replace function public.smaran_claim_due_notifications(window_start timestamptz, window_end timestamptz)
returns table(
  event_id uuid,
  user_id uuid,
  title text,
  group_id uuid,
  group_name text,
  start_time timestamptz,
  notification_kind text
)
language sql
security definer
set search_path = pg_catalog, public
as $$
with scheduled as (
  select
    e.id as event_id,
    gm.user_id,
    e.title,
    e.group_id,
    g.name as group_name,
    e.start_time,
    'LOUD'::text as notification_kind,
    e.start_time as scheduled_for
  from public.events e
  join public.groups g on g.id = e.group_id
  join public.group_members gm on gm.group_id = e.group_id
  where e.urgency_tier = 'LOUD'
    and e.status = 'active'
    and e.start_time > window_start
    and e.start_time <= window_end

  union all

  select
    e.id as event_id,
    gm.user_id,
    e.title,
    e.group_id,
    g.name as group_name,
    e.start_time,
    ('WARNING_' || warning.value::text)::text as notification_kind,
    e.start_time - (warning.value * interval '1 minute') as scheduled_for
  from public.events e
  join public.groups g on g.id = e.group_id
  join public.group_members gm on gm.group_id = e.group_id
  cross join lateral unnest(e.warning_minutes) as warning(value)
  where e.urgency_tier in ('WARNING','LOUD')
    and e.status = 'active'
    and warning.value > 0
    and e.start_time - (warning.value * interval '1 minute') > window_start
    and e.start_time - (warning.value * interval '1 minute') <= window_end
), claimed as (
  insert into public.notification_deliveries(event_id, user_id, kind)
  select event_id, user_id, notification_kind
  from scheduled
  on conflict (event_id, user_id, kind) do nothing
  returning event_id, user_id, kind
)
select s.event_id, s.user_id, s.title, s.group_id, s.group_name, s.start_time, s.notification_kind
from scheduled s
join claimed c
  on c.event_id = s.event_id
 and c.user_id = s.user_id
 and c.kind = s.notification_kind;
$$;

revoke all on function public.smaran_claim_due_notifications(timestamptz,timestamptz) from public;
grant execute on function public.smaran_claim_due_notifications(timestamptz,timestamptz) to service_role;
