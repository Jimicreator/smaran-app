# Smaran v1.3.1

## Windows development fixes

- Fixed the Windows project-root calculation in `scripts/dev.mjs`.
- The launcher now uses `fileURLToPath()` instead of `URL.pathname`, avoiding paths such as `C:\\C:\\...` and the resulting false `Next.js is not installed` message.
- Next.js is launched directly with the current Node executable and the absolute Next CLI path.
- LAN addresses are now detected with a stricter IPv4 parser.
- Virtual/WSL/Docker/VPN adapters are deprioritized; normal `192.168.x.x` Wi-Fi addresses are shown first.
- `npm run dev` now enables LAN by default so the same command works for PC + phone testing.
- `npm run dev:local` remains available when LAN binding is not desired.

## Doctor fixes

- `npm run doctor` now resolves Next.js and TypeScript from the local project rather than relying on fragile path checks.
- Removed the false `npm available` failure path.
- The root TypeScript check continues to exclude `supabase/functions/**`, which are Deno Edge Functions.

## Dependency stability

- Kept `@types/react` exactly at `^19.0.0`.
- No unnecessary framework upgrade was introduced.
