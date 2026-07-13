---
name: verify
description: Build, launch, and drive PantryPlate in a headless browser to verify changes at the UI surface.
---

# Verifying PantryPlate changes

Vite + React PWA, no test suite. Verify by building, serving, and driving the UI.

## Build & serve

```bash
npm ci                       # if node_modules missing
npm run build
npm run preview -- --port 4173 --strictPort &   # serves the dist build
```

The app is served at `http://localhost:4173/pantryplate/` (note the `/pantryplate/` base path — the root URL 302-redirects there).

## Drive it headlessly

Playwright is not a project dep; install `playwright-core` in the scratchpad and use the pre-installed browser at `/opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell` (pass as `executablePath`).

Gotchas:

- **Profile picker**: the app shows a Supabase-backed profile picker until `pp:profile` is set. Bypass with
  `ctx.addInitScript(() => localStorage.setItem("pp:profile", JSON.stringify({ id: "test", name: "Test" })))`.
  Supabase calls then fail (no network) and the app falls back to local data after ~a second — that's fine.
- **Nav tabs** (Today / Browse / Weekly Plan / Shopping) are `role="tab"`, not `role="button"`: use `page.getByRole("tab", { name: /Shopping/ })`.
- Opening the Weekly Plan or Shopping tab auto-builds a week plan from the bundled seed meals, so those views are never empty on first visit.
- All state is in `localStorage` under `meals:*` keys — inspect with `page.evaluate` to assert persistence, and reload the page to test rehydration.
- Don't `pkill -f "vite preview"` from a shell whose own command line contains that string — it kills the shell. Use `fuser -k 4173/tcp` instead.
