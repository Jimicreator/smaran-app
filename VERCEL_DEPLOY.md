# Smaran v1.3 — Vercel deployment

## 1. Push the project to GitHub

Do not commit `.env.local`.

## 2. Import in Vercel

Create a new Vercel project from the GitHub repository.

## 3. Environment variables

Production:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_APP_URL=https://YOUR_DOMAIN
NEXT_PUBLIC_VAPID_PUBLIC_KEY=YOUR_PUBLIC_VAPID_KEY
```

Do not put:

```text
SUPABASE_SERVICE_ROLE_KEY
VAPID_PRIVATE_KEY
SMARAN_CRON_SECRET
```

into `NEXT_PUBLIC_*` variables.

## 4. Supabase Auth redirect

Add:

```text
https://YOUR_DOMAIN/auth/callback
```

## 5. Web Push

Deploy the Supabase Edge Function:

```text
supabase/functions/dispatch-loud-alarms/index.ts
```

and configure its secrets.

## 6. Cron

Invoke the function every minute with:

```http
POST /functions/v1/dispatch-loud-alarms
x-smaran-cron-secret: YOUR_SECRET
```

Use a trusted scheduled job provider or Supabase scheduled infrastructure. The function is designed to claim each `(event,user,kind)` once, so duplicate schedule invocations do not repeatedly deliver the same LOUD notification.
