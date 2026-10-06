# Smaran + your Supabase project

Current local environment is already set to the project you supplied.

## Supabase

Project URL:

`https://fhxrwdqlrmjiwubqhcln.supabase.co`

Publishable key is stored in `.env.local`.

### Required

Authentication -> Providers -> Anonymous Sign-Ins -> Enable.

SQL Editor -> run:

`supabase/migrations/20261006_smaran_v1_3.sql`

### Optional Google

Authentication -> Providers -> Google -> configure OAuth.

Smaran still works without it.

### Local

```powershell
npm install --legacy-peer-deps
npm run doctor
npm run dev
```

Open `http://localhost:3000`.

For a phone on the same Wi-Fi, use the private IP printed by the dev launcher, not `0.0.0.0`.

If needed (PowerShell as Administrator):

```powershell
.\SMARAN_FIREWALL_PRIVATE.ps1
```
