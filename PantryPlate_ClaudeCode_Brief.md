# PantryPlate — Claude Code build brief

Turn the existing React prototype (`PantryPlate.jsx`) into a standalone, installable
PWA that works on desktop and phone, runs offline, and auto-updates its meal list.

## Goal
- Installable on computer (Chrome/Edge "Install app") and phone ("Add to Home Screen").
- Works offline after first load.
- **Meals auto-update**: the app fetches a remote `meals.json` on launch; editing that
  one file updates every installed copy without a rebuild.
- **App auto-updates**: pushing new code refreshes installed instances via the service worker.
- The user's own added meals + favorites persist locally and survive updates.

## Stack
- Vite + React
- `vite-plugin-pwa` (service worker, web manifest, auto-update registration)
- Plain `localStorage` for user data (no backend)
- Deploy: GitHub Pages (free, HTTPS — required for service workers)

## Repo structure
```
pantryplate/
  index.html
  package.json
  vite.config.js          # base: '/pantryplate/' for GH Pages; vite-plugin-pwa config
  public/
    meals.json            # the auto-updating meal list (seed meals live here now)
    icon-192.png
    icon-512.png
    apple-touch-icon.png  # 180x180, for iOS home screen
  src/
    main.jsx
    PantryPlate.jsx       # ported from the prototype
```

## Porting the prototype — specific changes
1. **Move seed meals out of the component** into `public/meals.json` (array of meal
   objects, same shape: id, name, type, time, fiber, protein, sat, cal, why, tags,
   ingredients, steps). The component fetches this on mount.
2. **Replace `window.storage`** with `localStorage`:
   - `meals:custom` and `meals:favorites` → `localStorage.getItem/setItem` (JSON).
   - Keep the try/catch + graceful fallback already in the code.
3. **Add remote fetch + merge** in the mount effect:
   - `fetch('meals.json')` → on success, cache the result in `localStorage` (`meals:remoteCache`)
     so offline still shows the latest fetched set; on failure, fall back to the cache,
     then to a small bundled fallback.
   - Final meal list = remote/cached meals + user's custom meals.
4. Everything else (filtering, sort incl. "Lightest", tags incl. "low-cal", modals,
   Add-meal form, calorie/fiber/protein spec rows) carries over unchanged.

## vite-plugin-pwa essentials
- `registerType: 'autoUpdate'`
- `manifest`: name "PantryPlate", short_name, theme_color `#1F4D32`, background_color
  `#F1F5EC`, display `standalone`, the three icons above.
- `workbox.runtimeCaching`: NetworkFirst for `meals.json` (so new meals win when online,
  cache covers offline); precache the app shell.

## Deploy (GitHub Pages)
1. `npm create vite@latest pantryplate -- --template react`, then add the files above.
2. `npm i -D vite-plugin-pwa gh-pages`
3. Set `base: '/pantryplate/'` in `vite.config.js`.
4. Build + publish `dist/` to the `gh-pages` branch (gh-pages package or a Pages Action).
5. Open the Pages URL on phone/desktop and install. Service worker requires HTTPS — GH
   Pages provides it.

## Adding meals later
- Edit `public/meals.json` (or the deployed copy) and push. Installed apps pull it on next open.
- Stretch idea that fits your elle-bot pattern: a GitHub issue template "Submit a meal" →
  Action/bot validates and appends to `meals.json` → auto-deploys. New meals land with zero manual edits.

## Suggested first prompt to Claude Code
> Scaffold a Vite + React PWA called pantryplate using vite-plugin-pwa with autoUpdate.
> Port the attached PantryPlate.jsx: move its SEED_MEALS into public/meals.json, fetch
> that on mount with NetworkFirst caching, and swap window.storage for localStorage.
> Configure the manifest and icons, set base to '/pantryplate/', and wire up GitHub Pages
> deploy. Then run the dev server and fix anything that breaks.

Drop this file and `PantryPlate.jsx` in the repo so Claude Code has both.
