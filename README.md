# Smaran v1.4.0

Smaran is a realtime collaborative reminder/alarm web app built around a simple promise:

**Create one group reminder once. Every connected member sees it. Enabled devices can receive the alarm automatically.**

Google is optional. Guest-first access is the normal flow.

## Stack
- Next.js App Router 16.3.8
- TypeScript
- React 19.3.0
- Tailwind CSS 4.3.3
- Supabase Auth + PostgreSQL + Realtime
- PWA + Service Worker
- Web Audio API
- Web Push for production background delivery
- Supabase Edge Function / Deno dispatcher

The project intentionally keeps `@types/react` at `^19.0.0`.

## Core features
- Create a group with a six-character invite code.
- Join from `/join/CODE` without mandatory Google sign-in.
- Add INFO, WARNING, or LOUD reminders.
- Realtime event delivery to every connected member.
- LOUD full-screen alarm while the app is open.
- Browser notification fallback.
- Optional Web Push for background/closed-browser delivery.
- Phone-ready invite link + QR generated from the PC's LAN address during local development.
- Google Calendar + `.ics` exports.
- Responsive desktop and mobile layout.

The acknowledgement/roster interface has been removed from the product UI.

## Install

Use Node 22.13+ for the cleanest dependency path. Your application can still run on Node 20.9+, but newer development dependencies prefer newer Node 22 patches.

```powershell
npm install --legacy-peer-deps
npm run doctor
npm run typecheck
npm run build
```

## Supabase

1. Open the SQL Editor in the **SMARAN** Supabase project.
2. Enable `Authentication → Providers → Anonymous Sign-Ins`.
3. Run **only** `supabase/migrations/20261006_smaran_v1_3.sql` if your project has not yet been repaired with v1.3.
4. Then run `supabase/migrations/20261006_smaran_v1_4.sql`.

The v1.3 migration avoids the overloaded legacy `is_group_member(uuid)` function name. v1.4 adds the scheduled notification claim function.

## Local PC

```powershell
npm run dev
```

Open:

`http://localhost:3000`

The launcher prints one or more addresses such as:

`PHONE on same Wi-Fi: http://192.168.29.52:3000`

Use that exact address on the phone. Do not use `0.0.0.0` or `localhost` on the phone.

The Invite modal also queries `/api/network-info` and uses a phone-ready LAN URL in its QR/link when you are running locally.

## Phone limitations during local HTTP testing

The web application itself can be opened over the local LAN HTTP address.

Browser Notifications, Service Workers, PWA installation, and Web Push on a phone require a secure HTTPS context. For real device alarm testing, deploy the app to Vercel (or another HTTPS host) and use that URL.

Some college/guest Wi-Fi networks block device-to-device LAN access. In that case the phone cannot reach the PC dev server even when Next.js is configured correctly; use the HTTPS deployment.

## Production Web Push

Generate VAPID keys:

```powershell
npx web-push generate-vapid-keys
```

Set the public key in Vercel:

`NEXT_PUBLIC_VAPID_PUBLIC_KEY=...`

Set these Edge Function secrets:
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `SMARAN_CRON_SECRET`

Deploy `supabase/functions/dispatch-loud-alarms` and invoke it on a schedule around once per minute. It sends scheduled WARNING and LOUD notifications to subscribed devices of all group members.

Each physical device must grant notification permission once and create its own push subscription. Smaran cannot silently bypass browser or OS notification permissions.

## Google login

Not required. It is only an optional identity upgrade for users who want the same identity across devices.

## Verification order

```text
Create group
  ↓
Copy phone-ready invite
  ↓
Join from second browser/phone
  ↓
Create reminder
  ↓
Other device receives event through Realtime
  ↓
Enable device alerts
  ↓
Test WARNING / LOUD background notification on HTTPS production
```
