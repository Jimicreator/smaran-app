# Claude workflow for Smaran

Claude Free is useful for reviewing and patching this project, but use it as an engineer reviewing an existing system rather than as a generator of replacement projects.

## Prompt

```text
You are maintaining an existing production-oriented Next.js 16.3.8 + React 19.3.0 + TypeScript + Tailwind 4 + Supabase app named Smaran.

Do NOT regenerate the whole application. Do NOT change package versions unless there is a demonstrated compatibility problem. Keep @types/react at ^19.0.0.

Before editing:
1. Read package.json.
2. Read README.md.
3. Read SMARAN_PROJECT_BLUEPRINT.md.
4. Read the failing file and the direct import/call chain.
5. Identify the smallest root cause.

After editing:
1. Preserve the existing architecture.
2. Run npm run typecheck.
3. Run npm run lint when practical.
4. Run npm run build when practical.
5. Report exactly which files changed and why.
6. Never hide an error by replacing real functionality with a mock.

For Supabase bugs, verify the authenticated browser session, RLS policy, and RPC/schema before changing UI state code.
For realtime bugs, verify subscription status and payload filtering before adding polling.
For alarm bugs, account for browser autoplay/background restrictions instead of claiming a closed browser can play arbitrary audio.
```
