# Replace your old Smaran folder

Use this release as the new baseline. Do not merge the old `scripts/dev.mjs` into it.

1. Close any old Smaran terminal windows.
2. Extract this ZIP into a NEW folder, for example `C:\Users\jites\Downloads\smaran-v1.3.1`.
3. Open that new folder in VS Code.
4. Run:

```powershell
npm install --legacy-peer-deps
npm run doctor
npm run typecheck
npm run build
npm run dev
```

Open `http://localhost:3000`.

## Why the old launcher failed

On Windows, `new URL(...).pathname` turns a file URL such as `file:///C:/...` into `/C:/...`. Passing that through Windows path resolution can produce an invalid path. The old launcher then reported `Next.js is not installed` even though `npm install` had succeeded.

This release uses `fileURLToPath(new URL(...))`, so the project root is a real Windows path.

## Phone

`npm run dev` binds the development server to all interfaces and prints usable private IPv4 addresses. Use a printed `192.168.x.x` address on a phone connected to the same Wi-Fi, for example:

`http://192.168.29.52:3000`

Never use `0.0.0.0` in the phone browser.

If Windows Firewall blocks access, run `SMARAN_FIREWALL_PRIVATE.ps1` once from an Administrator PowerShell.
