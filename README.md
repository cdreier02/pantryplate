# PantryPlate

An installable PWA of simple, LDL-friendly vegetarian meals — search, filter, favorite,
and add your own — all built from one shared core pantry. Works offline, auto-updates,
and pulls new meals from a single remote file.

**Live:** https://cdreier02.github.io/pantryplate/

## Develop

```bash
npm install
npm run dev        # http://localhost:5173/pantryplate/
```

## Build & preview

```bash
npm run build      # outputs dist/
npm run preview    # serves the production build locally
```

## How the data works

- **`src/seedMeals.js`** is the single authored source of meals. It is bundled into the
  app as the always-present **offline fallback**, so a cold first launch with no network
  is never empty.
- **`public/meals.json`** is the **live update channel**. On launch the app fetches it
  (NetworkFirst), caches the result in `localStorage`, and merges it with the user's own
  added meals. Resolution order: remote → cached → bundled seeds.
- A user's added meals (`meals:custom`) and favorites (`meals:favorites`) live in
  `localStorage` and survive app updates.

### Adding meals

Edit **`public/meals.json`** and push — every installed app pulls it on next open.
To also update the offline fallback baseline, edit `src/seedMeals.js` and run
`npm run gen:meals` (which rewrites `public/meals.json` from the seed array).

Meal shape: `{ id, name, type, time, fiber, protein, sat, cal, why, tags[], ingredients[], steps[] }`
(`type` ∈ Breakfast | Lunch | Dinner | Snack; `sat` ∈ very low | low | moderate).

## Regenerate icons

```bash
npm run gen:icons  # rebuilds the green sprout PWA icons in public/
```

## Deploy

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and publishes to
GitHub Pages. Pages source must be set to **GitHub Actions**.

## Slow Water (side toy)

`public/slow-water/index.html` is a separate, self-contained page that ships alongside
PantryPlate at **https://cdreier02.github.io/pantryplate/slow-water/**. It is an ambient
chord-progression synth: it plays slow pad chords whose notes glide from one chord to the
next, either looping a progression you build or wandering endlessly through a key.

- One file, no build step and no dependencies (Web Audio API, inline CSS and JS). Open it
  directly, or visit `/pantryplate/slow-water/index.html` under `npm run dev`.
- It shares nothing with the PantryPlate app. The only coupling is in `vite.config.js`,
  where the service worker is told to leave it out of the app shell and cache it on its own.
- Loops you save live in `localStorage` under `slowwater.*` keys.
- Lines marked `<!-- standalone -->` are the document wrapper. Dropping them
  (`grep -v '<!-- standalone -->' public/slow-water/index.html`) gives a fragment that can
  be published as a Claude artifact.

## Stack

Vite · React · vite-plugin-pwa (service worker + manifest, `registerType: 'prompt'`) ·
plain `localStorage` (no backend) · GitHub Pages.
