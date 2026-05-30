# Space conventions

The long-form reference for building a **space** in GBA. For the terse version that AI
agents read first, see [`AGENTS.md`](../AGENTS.md). For the quickstart, see the
[`README`](../README.md).

> ⚠️ This repo runs a **modified Next.js**. Before writing framework code, read the
> relevant guide in `node_modules/next/dist/docs/`. APIs may differ from upstream.

---

## What a space is

A **space** is one self-contained page or mini-app served at `/<slug>` under the single
root domain. Spaces are independent: they don't share components, state, or styling with
each other, and they never link into one another's folders. The only shared surfaces are:

- `app/layout.tsx` — the root `<html>`/`<body>` and global metadata.
- `app/globals.css` — the base dark theme.
- `app/_lib/spaces.ts` — the registry every space registers itself in.

## Anatomy

```
app/<slug>/
├─ layout.tsx               # scoped <Metadata> + fonts; visual isolation
├─ page.tsx                 # the route entry
├─ actions.ts               # optional: "use server" mutations
├─ _components/             # non-routable UI + CSS modules
│  └─ <slug>.module.css
└─ _lib/                    # non-routable logic (types, server-only clients)
```

### Naming rules

- `<slug>` is **kebab-case** and **equals the route**: `app/team-roster/` → `/team-roster`.
- Folders that start with `_` are **private** (not routable) — use them for everything
  that isn't a `page`/`layout`/`route`/`actions` file. Confirmed in
  `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`.
- Route groups `(group)` are available if you ever want to share a layout across several
  spaces without affecting the URL — not needed for a standalone space.

### Layout, metadata & fonts

Each space owns its identity. Give it a `layout.tsx` that sets scoped `metadata` and loads
its own fonts via `next/font/google` (self-hosted + preloaded by Next). Expose fonts as
CSS variables and apply them on a wrapper. Pattern (mirrors
`app/chase-medicine/layout.tsx`):

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import s from "./_components/my-space.module.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "My Space",
  description: "What it does.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className={`${inter.variable} ${s.shell}`}>{children}</div>;
}
```

### Styling

Use **CSS Modules** (`*.module.css`) scoped to the space. `globals.css` is the only global
stylesheet — don't add global selectors from inside a space. The base theme is dark
(`--bg: #060607`, light text); inherit it or override locally.

---

## Optional add-ons (recipes)

The scaffolder produces a **minimal static** space. Bolt these on only when needed. They
are lifted from the proven `chase-medicine` implementation.

### Server actions

Put mutations in `actions.ts`. They run on the server and can be imported by client
components.

```ts
"use server";

export async function doThing(input: string): Promise<{ ok: boolean }> {
  // ...validate, write to DB, etc.
  return { ok: true };
}
```

### Supabase (server-only, service role)

Add `@supabase/supabase-js` (already a dependency). The client uses the **service-role**
key, bypasses RLS, and must **never** be imported into a client component — gate all
access behind server actions. Pattern (mirrors `app/chase-medicine/_lib/supabase.ts`):

```ts
// app/<slug>/_lib/supabase.ts
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
```

`import "server-only"` makes the build fail loudly if this ever gets pulled into client
code. Keep shared types in a DB-free `_lib/*.ts` module so both server actions and client
components can import them (see `chase-medicine/_lib/schedule.ts`).

### Passcode gate (path-scoped cookie)

For private tools, gate the page on a passcode kept in an env var, and store the unlock in
a **path-scoped** httpOnly cookie so it never leaks to other spaces. Pattern (mirrors
`app/chase-medicine/actions.ts` + `page.tsx`):

```ts
// in actions.ts
"use server";
import { cookies } from "next/headers";

const COOKIE = "myspace_auth";

export async function unlock(code: string): Promise<{ ok: boolean }> {
  const expected = process.env.MYSPACE_CODE;
  if (!expected || code !== expected) return { ok: false };
  const jar = await cookies();
  jar.set(COOKIE, expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/my-space", // ← scope to THIS space only
    maxAge: 60 * 60 * 24 * 365,
  });
  return { ok: true };
}
```

```tsx
// in page.tsx — gate before rendering the app
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function Page() {
  const code = process.env.MYSPACE_CODE;
  const jar = await cookies();
  const unlocked = !!code && jar.get("myspace_auth")?.value === code;
  return unlocked ? <App /> : <Gate />;
}
```

A private space should be `status: "private"` (or `hidden: true`) in the registry so it
stays out of `/spaces` and the sitemap.

### Static vs dynamic rendering

A plain page is statically rendered by default. Reach for `export const dynamic =
"force-dynamic"` only when the page reads request-time data (cookies, headers,
per-request DB reads), as the gated example does.

---

## The registry

Every space gets one entry in [`app/_lib/spaces.ts`](../app/_lib/spaces.ts). The
scaffolder appends it; you can also edit by hand.

```ts
{
  slug: "my-space",          // == route folder name
  title: "My Space",
  description: "What it does.",
  status: "wip",             // "live" | "wip" | "private"
  added: "2026-05-29",       // YYYY-MM-DD
  // hidden: true,           // force-hide from directory + sitemap
  // emoji: "✨",
}
```

- `status: "wip"` and `status: "private"` (and `hidden: true`) are **excluded** from the
  `/spaces` directory and the sitemap. Flip to `"live"` when ready.
- `publicSpaces()` drives both `/spaces` and `app/sitemap.ts`, so listing is automatic.

---

## Environment variables

- Secrets live in env vars only — never commit them. Local dev uses `.env.local`.
- Set production values in the Vercel dashboard or via `vercel env`.
- Common ones: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and per-space passcodes like
  `MYSPACE_CODE`.
- Keep `BASE_URL` in `app/sitemap.ts` in sync with `metadataBase` in `app/layout.tsx`.

## Pre-deploy checklist

- [ ] Route loads at `/<slug>` in `npm run dev`.
- [ ] Registry entry exists; `status` is correct (`live` to publish).
- [ ] No imports from another space's folder.
- [ ] Any server-only module starts with `import "server-only"`.
- [ ] Secrets are env vars and set in Vercel (not hardcoded, not committed).
- [ ] `npm run build` and `npm run lint` pass.
- [ ] `/spaces` and `/sitemap.xml` reflect the space as intended.
