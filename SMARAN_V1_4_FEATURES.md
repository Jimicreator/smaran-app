# Smaran v1.4 — product focus

## Core loop
1. Create a group.
2. Share a phone-ready invite link or QR.
3. A member joins in seconds with a display name.
4. Any member who can manage the group adds a reminder/alarm.
5. Supabase Realtime delivers the event to every connected member.
6. Enabled devices can receive browser/Web Push alerts at warning times and at LOUD trigger time.

## No roster UI
The product no longer exposes live acknowledgement rosters, acknowledgement counts, or member-by-member alarm status. The interface is about remembering and alerting people, not policing attendance.

## Local development
- Desktop: `http://localhost:3000`
- Phone web testing: use the `PHONE on same Wi-Fi` URL printed by `npm run dev` and the Invite dialog.
- Do not use `0.0.0.0` or `localhost` on a different phone.
- Phone notification/PWA features require HTTPS; use the deployed Vercel URL for those capabilities.

## Production notifications
Each physical device must grant notification permission and create its own Web Push subscription. With VAPID keys configured, the Supabase Edge Function sends scheduled WARNING and LOUD notifications to every subscribed group member device.

A standard webpage cannot silently create a native OS alarm or bypass browser/OS notification and audio permissions. Smaran therefore uses realtime for immediate synchronization and Web Push for true background delivery.
