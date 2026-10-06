# Smaran deployment checklist

1. Push the v1.4 source to GitHub.
2. Keep `.env.local` out of Git.
3. In Supabase, ensure Anonymous Sign-Ins are enabled.
4. Run the existing v1.3 repair migration if it has not already been run.
5. Run `supabase/migrations/20261006_smaran_v1_4.sql`.
6. Run `npm run typecheck` and `npm run build` locally.
7. Deploy the Next.js app to Vercel.
8. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Vercel.
9. Set `NEXT_PUBLIC_APP_URL` to the final HTTPS URL.
10. Generate VAPID keys for background device notifications.
11. Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` in Vercel.
12. Set VAPID secrets and `SMARAN_CRON_SECRET` in Supabase Edge Functions.
13. Deploy `dispatch-loud-alarms`.
14. Schedule the dispatcher around once per minute.
15. Test create/join/realtime on two devices.
16. Enable device alerts on each physical device.
17. Test a WARNING and LOUD notification on Android/Chrome or another supported HTTPS browser.
18. Configure Google OAuth only if the optional account-linking feature is needed.
