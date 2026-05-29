# gba-space

A personal **digital garden** — one site hosting many unrelated little projects, each
living at its own route. There is intentionally **no nav and no links between pages**;
every route stands on its own.

- `/` — an interactive particle field with the letters **GBA** in the center
  (drifting glyphs, a mouse-reactive dot network, and thin links between the letters
  that fade in and out).

Built with **Next.js (App Router) + TypeScript**, deployed on **Vercel**.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
```

## Add a new "page" / mini-project

Each project is a self-contained folder under `app/`. To add one at, say, `/chart`:

```
app/
  chart/
    page.tsx            # the route — required
    _components/         # co-locate this route's code here (the _ keeps it out of routing)
    layout.tsx          # optional: add one for full visual isolation from other routes
```

Rules of the garden:

- A route **must not import** from another route's folder. Keep them independent.
- The only shared things are `app/layout.tsx` (root `<html>`/`<body>`) and
  `app/globals.css` (base background/colors). Override styling per-route as needed.
- Reusable pieces for the root page live in `app/_components/`
  (`GbaField.tsx` = the canvas, `field.ts` = pure simulation math).

Then commit, push, and merge to `main` — it deploys automatically and becomes
`https://<your-domain>/chart`.

## Deploy (Vercel, free)

Connected to Vercel's GitHub integration:

- Every push to **`main`** → production deploy.
- Every branch / PR → its own **preview URL**.

First-time setup: import this repo at [vercel.com/new](https://vercel.com/new)
(Next.js is auto-detected, zero config), or use the CLI:

```bash
npm i -g vercel
vercel login
vercel link
```

## Notes

- The root page respects `prefers-reduced-motion` (renders a calm static scene) and
  pauses its animation loop when the tab is hidden.
