@AGENTS.md

# Playbook: creating a new page / space

This repo is **one Next.js app hosting many independent "spaces"** — each a self-contained
page or mini-app served at `/<slug>`. Almost every request here is "add a new space."

**Meta routes** (don't recreate these): `/sitemap.xml` = machine sitemap for crawlers
(`app/sitemap.xml/route.ts`, styled by `public/sitemap.xsl`); `/spaces` = public directory
of live spaces; `/all` = owner-only (passcode `SPACES_CODE`) overview of every route with
drift detection, backed by the auto-generated `app/_lib/routes.generated.ts` (written by
`scripts/scan-routes.mjs` on `predev`/`prebuild` — never edit it by hand).

## When this applies (trigger)

Treat **any** of these as a request to create a new space, and follow the workflow below:

- "Create a page that …", "make a web page / site / tool / app that …"
- "Add a route / path / page under gba-space for …"
- "Build me a … (tracker / dashboard / timer / form / game / calculator / …)"
- Anything describing a new thing to live at its own URL.

Do **not** start writing files ad hoc. Use the scaffolder and conventions — that is the
whole point of this repo's setup.

## Workflow (do this in order)

1. **Load the rules.** The conventions in `AGENTS.md` (imported above) and the long-form
   reference + copy-paste recipes in `docs/SPACE-CONVENTIONS.md` are mandatory. This is a
   **modified Next.js** — read the relevant guide in `node_modules/next/dist/docs/` before
   using any framework API.

2. **Decide slug + title + description.** `slug` is kebab-case and becomes the route
   (`app/<slug>/` → `/<slug>`). Derive these from the request; only ask the user if it's
   genuinely ambiguous. Confirm the slug isn't already in `app/_lib/spaces.ts`.

3. **Scaffold — never hand-copy boilerplate.** Run:

   ```bash
   npm run new-space <slug> -- --title "<Title>" --desc "<one-line description>"
   ```

   This creates `app/<slug>/{layout.tsx,page.tsx,_components/<slug>.module.css}` (minimal
   static template) and registers the space in `app/_lib/spaces.ts` with `status: "wip"`.
   For a richer, autonomous build you may delegate to the **`space-builder`** subagent; the
   user can also invoke the **`/new-space`** skill directly.

4. **Add backends only if the request needs them** — copy the recipe from
   `docs/SPACE-CONVENTIONS.md`, don't invent patterns. Decision matrix:

   | The request mentions…                         | Add this                                              |
   | --------------------------------------------- | ----------------------------------------------------- |
   | "a db", "store/save data", "persist", "shared"| **Supabase** server-only client in `_lib/supabase.ts` (`import "server-only"`) |
   | "form", "submit", "save", "update", a mutation| **Server actions** in `actions.ts` (`"use server"`)   |
   | "private", "login", "passcode", "only me/us"  | **Passcode gate**: path-scoped cookie + `<SLUG>_CODE` env var; set space `status: "private"` |
   | reads cookies/headers/per-request data        | `export const dynamic = "force-dynamic"`              |
   | nothing of the above                          | leave it static (default)                             |

   The existing `app/chase-medicine/` space is the reference implementation for all of these.

5. **Build the actual page** per the user's intent, honoring every rule in `AGENTS.md`
   (CSS Modules only, scoped fonts/metadata in `layout.tsx`, no cross-space imports,
   server-only code marked, secrets via env vars).

6. **Register & verify.** Confirm the `app/_lib/spaces.ts` entry. Run `npm run build`
   (fix any failure — never report success on a red build). Have the route checked at
   `/<slug>` (e.g. `npm run dev`). When it's ready to be public, set `status: "live"` so it
   appears in `/spaces` and the sitemap; keep `"wip"`/`"private"`/`hidden` otherwise.

7. **Secrets discipline.** Never commit secrets. `.env.local` is gitignored. The repo is
   linked to Vercel, so set real values with `vercel env add <NAME> production` (or the
   dashboard) and `vercel env pull .env.local` to sync down; add the *name* to
   `.env.example`. Code/docs reference env-var *names* only. Sanity-check the diff before
   committing.

8. **Ship if asked.** If the user wants it deployed: branch off `main`, commit, push, open
   a PR with `gh`, verify checks are green, then merge — merging to `main` auto-deploys to
   production on Vercel. Confirm `gba-space.vercel.app/<slug>` responds. Don't commit/push
   unless the user asked.

## Examples (request → what to do)

- *"Create a page with a countdown to my birthday."* → static space; no db/actions.
- *"Make a tool that tracks my workouts with a db."* → space + Supabase + server actions;
  `status` live (or private if personal).
- *"Build a private dashboard for our team with a login."* → space + passcode gate +
  (likely) Supabase; `status: "private"`, `<SLUG>_CODE` env var set in Vercel.
- *"Add a /links page listing my socials."* → static space, set `status: "live"`.
