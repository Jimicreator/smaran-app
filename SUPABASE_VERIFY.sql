-- Smaran v1.4 verification (read only)
select to_regclass('public.groups') as groups_table,
       to_regclass('public.group_members') as group_members_table,
       to_regclass('public.events') as events_table,
       to_regclass('public.push_subscriptions') as push_subscriptions_table,
       to_regclass('public.notification_deliveries') as notification_deliveries_table;

select p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('smaran_is_group_member','smaran_is_group_admin','smaran_create_group','smaran_join_group','smaran_claim_due_notifications')
order by p.proname;

select tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and tablename in ('events','group_members')
order by tablename;
