#!/usr/bin/env node
// Scaffold a new GBA "space".
//
//   npm run new-space <slug> -- --title "My Space" --desc "What it does"
//
// Creates app/<slug>/ from the minimal static template and registers the space
// in app/_lib/spaces.ts (status "wip"). No new dependencies — Node built-ins
// only, so it also works in CI. See docs/SPACE-CONVENTIONS.md for the optional
// add-ons (Supabase, passcode gate, server actions).

import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP_DIR = join(ROOT, "app");
const REGISTRY = join(APP_DIR, "_lib", "spaces.ts");

// Route segments that are taken by framework files or existing infrastructure.
const RESERVED = new Set([
  "spaces",
  "all",
  "api",
  "_lib",
  "_components",
  "sitemap",
]);

function fail(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

function exists(path) {
  return access(path).then(
    () => true,
    () => false,
  );
}

// --- parse args ------------------------------------------------------------
function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

const { positional, flags } = parseArgs(process.argv.slice(2));
const slug = positional[0];

if (!slug) {
  fail(
    'Usage: npm run new-space <slug> -- --title "Title" --desc "Description"',
  );
}

if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(slug)) {
  fail(
    `Invalid slug "${slug}". Use lowercase kebab-case (e.g. "my-cool-thing").`,
  );
}

if (RESERVED.has(slug)) {
  fail(`"${slug}" is a reserved route segment. Pick another slug.`);
}

const title = typeof flags.title === "string" ? flags.title : toTitle(slug);
const desc =
  typeof flags.desc === "string"
    ? flags.desc
    : typeof flags.description === "string"
      ? flags.description
      : "A new little corner of GBA.";

function toTitle(s) {
  return s
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// --- templates -------------------------------------------------------------
function layoutTemplate() {
  return `import type { Metadata } from "next";
import { Inter } from "next/font/google";
import s from "./_components/${slug}.module.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: ${JSON.stringify(title)},
  description: ${JSON.stringify(desc)},
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className={\`\${inter.variable} \${s.shell}\`}>{children}</div>;
}
`;
}

function pageTemplate() {
  return `import s from "./_components/${slug}.module.css";

export default function Page() {
  return (
    <main className={s.main}>
      <h1 className={s.title}>${escapeJsx(title)}</h1>
      <p className={s.lede}>${escapeJsx(desc)}</p>
    </main>
  );
}
`;
}

function cssTemplate() {
  return `.shell {
  min-height: 100%;
  font-family: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
}

.main {
  max-width: 42rem;
  margin: 0 auto;
  padding: clamp(2rem, 8vw, 6rem) 1.25rem;
}

.title {
  font-size: clamp(2rem, 7vw, 3.5rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #f3f4f6;
}

.lede {
  margin-top: 0.75rem;
  color: #9ca3af;
  font-size: 1.1rem;
  line-height: 1.5;
}
`;
}

function escapeJsx(str) {
  return str.replace(/[<>{}]/g, (c) => `{"${c}"}`);
}

// --- registry insertion ----------------------------------------------------
function registryEntry() {
  const today = new Date().toISOString().slice(0, 10);
  return `  {
    slug: ${JSON.stringify(slug)},
    title: ${JSON.stringify(title)},
    description: ${JSON.stringify(desc)},
    status: "wip",
    added: ${JSON.stringify(today)},
  },
`;
}

async function insertIntoRegistry() {
  const src = await readFile(REGISTRY, "utf8");
  if (src.includes(`slug: ${JSON.stringify(slug)}`)) {
    console.warn(`• Registry already has an entry for "${slug}" — skipping.`);
    return;
  }
  const marker = "export const spaces: Space[] = [";
  const idx = src.indexOf(marker);
  if (idx === -1) {
    fail(
      `Could not find "${marker}" in ${REGISTRY}. Add the entry by hand:\n${registryEntry()}`,
    );
  }
  const insertAt = idx + marker.length;
  const next =
    src.slice(0, insertAt) + "\n" + registryEntry() + src.slice(insertAt);
  await writeFile(REGISTRY, next, "utf8");
}

// --- run -------------------------------------------------------------------
const spaceDir = join(APP_DIR, slug);

if (await exists(spaceDir)) {
  fail(`app/${slug}/ already exists. Refusing to overwrite.`);
}

await mkdir(join(spaceDir, "_components"), { recursive: true });
await writeFile(join(spaceDir, "layout.tsx"), layoutTemplate(), "utf8");
await writeFile(join(spaceDir, "page.tsx"), pageTemplate(), "utf8");
await writeFile(
  join(spaceDir, "_components", `${slug}.module.css`),
  cssTemplate(),
  "utf8",
);
await insertIntoRegistry();

console.log(`
✓ Created space "${slug}"

  app/${slug}/layout.tsx
  app/${slug}/page.tsx
  app/${slug}/_components/${slug}.module.css
  + registered in app/_lib/spaces.ts (status: "wip")

Next:
  • npm run dev   → visit http://localhost:3000/${slug}
  • Build it out, then flip status to "live" in app/_lib/spaces.ts
  • Need a backend / passcode? See docs/SPACE-CONVENTIONS.md
`);
