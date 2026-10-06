# Smaran mobile + alert behavior

## Local PC → phone
1. Run `npm run dev`.
2. Use the `PHONE on same Wi-Fi` address printed by the launcher.
3. The Invite dialog also detects the same LAN address and puts it into the QR/link automatically.
4. Do not use `localhost` or `0.0.0.0` on the phone.

## If the phone cannot open the site
- Confirm both devices are on the same Wi-Fi.
- Run the private-network firewall helper on Windows if necessary.
- Some guest/college Wi-Fi networks isolate clients and will block PC → phone access. Deploy to Vercel in that case.

## Alert model
- Open connected app: Supabase Realtime delivers the event immediately.
- Hidden tab: browser notifications can announce new events when permission is granted.
- Background/closed browser: Web Push is the production mechanism.
- Each device must grant notification permission and, when VAPID is configured, create a push subscription.
- A browser cannot silently create a native OS alarm or bypass notification/audio permissions.
