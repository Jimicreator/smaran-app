# Smaran v1.3.0 — changes

## Critical fixes

- Replaced the Windows `npx.cmd` child process with the local Next CLI launched directly by Node. This removes the v1.2 `spawn EINVAL` path.
- Fixed private IPv4 detection so LAN addresses such as `192.168.x.x` are actually printed.
- `npm run doctor` no longer falsely reports npm as unavailable when invoked from npm.
- Root TypeScript checking excludes the Supabase Deno Edge Function and the Edge Function has its own `deno.json` configuration.
- Removed dependency on overloaded generic PostgreSQL function names for Smaran's new path.

## Database

- New migration: `supabase/migrations/20261006_smaran_v1_3.sql`.
- New functions use the `smaran_*` namespace.
- Missing columns from older installs are added idempotently.
- Smaran RLS policies are rebuilt on the app tables.
- Realtime publication membership is restored.

## Browser application

- Group creation immediately updates the workspace before a background reconciliation fetch.
- Browser localStorage is no longer read during React render/SSR.
- Anonymous/guest sessions remain the default.
- Google remains optional.
- Existing realtime/event/alarm behavior is retained.

## Development

Use a fresh v1.3.0 extraction. Do not copy `node_modules` from a previous project.
