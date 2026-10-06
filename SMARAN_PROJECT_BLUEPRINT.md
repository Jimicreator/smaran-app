# Smaran v1.4 Blueprint

## Product promise
Create one reminder once; the whole group sees it. Devices that have notification permissions and production Web Push enabled can receive the alert automatically.

## Core flow
Create group → share phone-ready invite → member joins → set reminder/alarm → realtime event fan-out → device notification / LOUD takeover.

## Authentication
- Guest-first Supabase anonymous session.
- Google linking optional.
- No signup form required for basic use.

## Group model
- Six-character invite code.
- `/join/[code]` route.
- Display name attached to membership.
- Owner/admin/member authorization.

## Reminder model
- INFO: quiet reminder.
- WARNING: visible countdown and optional scheduled warning notifications.
- LOUD: full-screen takeover while open and scheduled background push when configured.
- Optional location, details, and URL.
- Google Calendar + .ics exports.

## Realtime
`events` and `group_members` are subscribed through Supabase Realtime. The dashboard no longer loads or subscribes to acknowledgement data.

## Device alert model
1. Browser notifications: one-time permission per device/browser.
2. Open app: realtime updates the event immediately.
3. Hidden tab: notification fallback when the browser remains connected.
4. Background/closed browser: Web Push through the Supabase Edge Function.
5. Each device has its own push subscription.

## Local development
- PC: `http://localhost:3000`
- Phone: `http://PC_LAN_IP:3000`
- Invite modal automatically queries `/api/network-info` and places a LAN URL into the QR/link when running locally.
- Phone notifications/PWA require HTTPS; local HTTP is primarily for testing LAN connectivity and realtime app behavior.

## Removed from v1.4 UI
- Live acknowledgement roster.
- Acknowledgement counts.
- Member-by-member alarm status.

The legacy acknowledgement table can remain in Supabase for non-destructive compatibility, but it is no longer part of the client application.
