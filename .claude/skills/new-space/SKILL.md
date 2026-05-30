---
name: new-space
description: Scaffold a new GBA "space" (a page/mini-app at /<slug>). Use when the user wants to add a new page, route, space, or mini-app to this repo. Runs the scaffolder, registers it, and offers to wire optional backends (Supabase, passcode gate, server actions).
---

# Create a new GBA space

A "space" is a self-contained page or mini-app served at `/<slug>`. This skill scaffolds
one consistently. Read `AGENTS.md` and `docs/SPACE-CONVENTIONS.md` if you need the full
conventions.

## Steps

1. **Gather inputs.** You need a `slug` (kebab-case, == route), a `title`, and a one-line
   `description`. If the user didn't give them, derive sensible defaults from their request
   or ask one concise question. Confirm the slug isn't already in `app/_lib/spaces.ts` and
   isn't reserved (`spaces`, `api`, `sitemap`, `_lib`, `_components`).

2. **Scaffold.** Run:

   ```bash
   npm run new-space <slug> -- --title "<Title>" --desc "<Description>"
   ```

   This creates `app/<slug>/` (layout + page + CSS module from the minimal static
   template) and appends a registry entry with `status: "wip"`. The script refuses if the
   folder already exists — don't overwrite.

3. **Decide on add-ons.** The template is intentionally minimal/static. Ask whether the
   space needs any of these, and only then wire them using the recipes in
   `docs/SPACE-CONVENTIONS.md`:
   - **Server actions** → add `actions.ts` with `"use server"`.
   - **Supabase backend** → add `_lib/supabase.ts` with `import "server-only"`; access
     only through server actions.
   - **Passcode gate** → path-scoped cookie (`path: "/<slug>"`) + an env var like
     `<SLUG>_CODE`; set `status: "private"` (or `hidden: true`) in the registry.

   Copy these from the existing `chase-medicine` space — don't invent new patterns.

4. **Build the actual page** per the user's intent, following all rules in `AGENTS.md`
   (no cross-space imports, CSS Modules only, scoped fonts/metadata in `layout.tsx`).
   Remember this is a **modified Next.js** — check `node_modules/next/dist/docs/` before
   using framework APIs.

5. **Verify.** Run `npm run build` (or have the user run `npm run dev`) and confirm the
   route renders at `/<slug>`. If the space is meant to be public, flip its `status` to
   `"live"` in `app/_lib/spaces.ts` so it appears in `/spaces` and the sitemap.

6. **Report** the new route, the registry status, and any env vars the user must set in
   Vercel before deploying.
