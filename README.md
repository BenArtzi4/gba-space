# gba-space

A personal **digital garden** — one site hosting many unrelated little projects ("spaces"),
each living at its own route. The pages themselves carry **no nav and no cross-links**;
every route stands on its own. The one exception is an opt-in directory at `/spaces` for
the ones you choose to list.

- `/` — an interactive particle field with the letters **GBA** in the center
  (drifting balloon glyphs, a mouse-reactive dot network, and a sparkle trail).
- `/spaces` — public directory of the spaces you mark `live` in the registry.
- `/all` — **owner-only** (passcode) overview of *every* route, built from the live
  app + registry, with drift warnings. Your private command center.
- `/chase-medicine` — a passcode-gated, shared daily medicine tracker for the dog
  (Supabase-backed; add medicines with daily times + a duration, check off doses).

### Three ways to "see what's here"

| Route           | Audience      | Shows                                            |
| --------------- | ------------- | ------------------------------------------------ |
| `/sitemap.xml`  | search engines| Live routes, as XML (styled for humans via XSL). |
| `/spaces`       | the public    | Live spaces, as a directory.                     |
| `/all`          | you (passcode)| **Everything** — live, wip, private + drift.     |

`/sitemap.xml` looking like raw data is correct — it's a machine file for crawlers; the
human pages are `/spaces` and `/all`.

Built with **Next.js (App Router) + TypeScript**, deployed on **Vercel**.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
```

> ⚠️ This repo runs a **modified Next.js** (see [AGENTS.md](AGENTS.md)). APIs may differ
> from upstream — read `node_modules/next/dist/docs/` before writing framework code.

## Add a new space

**In Claude Code:** run `/new-space` and describe what you want — it scaffolds the folder,
registers it, and offers to wire up any backend you need.

**From the terminal:**

```bash
npm run new-space my-cool-thing -- --title "My Cool Thing" --desc "What it does"
```

Either way you get `app/my-cool-thing/` from the minimal static template plus an entry in
the registry (`app/_lib/spaces.ts`, status `"wip"`). Then:

```bash
npm run dev        # visit http://localhost:3000/my-cool-thing
```

Build it out, then flip its `status` to `"live"` in the registry so it appears in `/spaces`
and the sitemap. Need a backend, a passcode gate, or server actions? Copy the recipe from
**[docs/SPACE-CONVENTIONS.md](docs/SPACE-CONVENTIONS.md)** — don't reinvent it.

### Anatomy of a space

```
app/
  my-cool-thing/
    page.tsx            # the route — required
    layout.tsx          # scoped metadata + fonts (full visual isolation)
    _components/         # this space's UI (the _ keeps it out of routing)
    _lib/                # this space's logic (server-only, types, helpers)
```

Rules of the garden:

- A space **must not import** from another space's folder. Keep them independent.
- The only shared things are `app/layout.tsx` (root `<html>`/`<body>`),
  `app/globals.css` (base background/colors), and `app/_lib/spaces.ts` (the registry).
  Override styling per-space with CSS Modules as needed.
- Reusable pieces for the root page live in `app/_components/`
  (`GbaField.tsx` = the canvas, `field.ts` = pure simulation math).
- **Every space gets one entry in `app/_lib/spaces.ts`** — the `/spaces` directory and
  the sitemap are both generated from it.

Full conventions: **[docs/SPACE-CONVENTIONS.md](docs/SPACE-CONVENTIONS.md)** (long-form,
with copy-paste recipes) and **[AGENTS.md](AGENTS.md)** (terse, what AI agents read first).

Then commit, push, and merge to `main` — it deploys automatically and becomes
`https://<your-domain>/my-cool-thing`.

## Deploy (Vercel, free)

Connected to Vercel's GitHub integration:

- Every push to **`main`** → production deploy.
- Every branch / PR → its own **preview URL**.

New spaces need no deploy config — they ship with the next push. Per-space environment
variables (e.g. `SUPABASE_URL`, passcodes) are set in the Vercel dashboard or via
`vercel env`.

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
