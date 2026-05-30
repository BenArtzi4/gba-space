<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# GBA: one repo, many "spaces"

This repo hosts many independent **spaces** — each a self-contained page or mini-app served at `/<slug>`. Spaces never share code, state, or styling with each other. The full reference is `docs/SPACE-CONVENTIONS.md`; the rules below are mandatory.

## Anatomy of a space

A space lives in `app/<slug>/`:

- `layout.tsx` — scoped `metadata` + fonts via `next/font/google`. Each space owns its identity.
- `page.tsx` — the route entry.
- `actions.ts` — optional `"use server"` mutations.
- `_components/` — non-routable UI + CSS Modules (`*.module.css`).
- `_lib/` — non-routable logic (types, server-only clients).

## Rules

- **Slug == route, kebab-case.** `app/team-roster/` → `/team-roster`.
- **Underscore = private.** Anything that isn't `page`/`layout`/`route`/`actions` goes in `_components/` or `_lib/`.
- **No cross-space imports.** A space must not import from another space's folder. The only shared modules are `app/layout.tsx`, `app/globals.css`, and `app/_lib/spaces.ts`.
- **Styling is local.** Use CSS Modules per space. `globals.css` is the only global stylesheet — never add global selectors from inside a space.
- **Server-only code starts with `import "server-only"`.** Put mutations in `actions.ts`. Never import a service-role/DB client into a client component.
- **Secrets are env vars only.** Passcode gates use a path-scoped cookie (`path: "/<slug>"`) so spaces stay isolated. Private spaces use `status: "private"` or `hidden: true`.
- **Register every space** in `app/_lib/spaces.ts`. The `/spaces` directory and `app/sitemap.ts` are generated from it via `publicSpaces()` — do not hand-maintain those.

## Scaffolding

Don't hand-copy files. Create a space with `npm run new-space <slug> -- --title "..." --desc "..."` (script: `scripts/new-space.mjs`). It writes the minimal static template and appends the registry entry. Add backends/passcode gates only when needed, using the recipes in `docs/SPACE-CONVENTIONS.md` (derived from the `chase-medicine` space). Default new spaces to minimal/static.
