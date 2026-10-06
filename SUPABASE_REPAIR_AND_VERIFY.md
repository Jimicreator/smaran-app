# Smaran v1.3 — Supabase repair procedure

Your Supabase SQL Editor is the correct place.

## Run exactly one file

```text
supabase/migrations/20261006_smaran_v1_3.sql
```

Do not run the old v1.2 migration again.

## What v1.3 fixes

- Old overloaded `public.is_group_member(...)` functions are no longer touched.
- New uniquely named helper functions avoid PostgreSQL overload ambiguity.
- New uniquely named create/join RPCs avoid old function collisions.
- Missing event columns are added with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
- Smaran RLS policies are rebuilt deterministically.
- Realtime publication entries are restored.

## Verify after Run

Run:

```sql
select routine_name, routine_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name like 'smaran_%'
order by routine_name;
```

You should see at least:

```text
smaran_create_group
smaran_is_group_admin
smaran_is_group_member
smaran_join_group
smaran_claim_due_loud_notifications
```

Then test:

```text
Smaran → Create group
Smaran → group appears immediately
Second browser → Join group
First browser → create LOUD alarm
Second browser → alarm appears without refresh
```
