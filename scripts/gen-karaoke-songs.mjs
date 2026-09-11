import { readFileSync, writeFileSync } from "node:fs";

const raw = readFileSync("songs.txt", "utf8");
const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

const parsed = lines.map((line) => {
  const i = line.indexOf(" - ");
  if (i === -1) throw new Error("unparseable line: " + line);
  const artist = line.slice(0, i).trim();
  const title = line.slice(i + 3).trim();
  const lang = /^[A-Za-z]/.test(artist) ? "en" : "he";
  return { artist, title, lang };
});

const he = new Intl.Collator("he", { sensitivity: "base" });
const en = new Intl.Collator("en", { sensitivity: "base" });

const hebrew = parsed
  .filter((s) => s.lang === "he")
  .sort((a, b) => he.compare(a.artist, b.artist) || he.compare(a.title, b.title));
const english = parsed
  .filter((s) => s.lang === "en")
  .sort((a, b) => en.compare(a.artist, b.artist) || en.compare(a.title, b.title));

const ordered = [...hebrew, ...english];

const rows = ordered
  .map((s, idx) => {
    const n = idx + 1;
    return (
      "  { n: " + n +
      ", artist: " + JSON.stringify(s.artist) +
      ", title: " + JSON.stringify(s.title) +
      ", lang: " + JSON.stringify(s.lang) +
      " },"
    );
  })
  .join("\n");

const header = [
  "// AUTO-GENERATED from songs.txt by scripts/gen-karaoke-songs.mjs.",
  "// The karaoke catalogue for ראש השנה תשפ״ז.",
  "//",
  "// Ordered by Hebrew collation (artist, then title) with Hebrew songs first and",
  "// English songs after. Numbers are sequential 1.." + ordered.length + " and are what guests",
  "// call out loud, so they must stay stable once the list has been shared.",
  "",
  "export type SongLang = \"he\" | \"en\";",
  "",
  "export interface Song {",
  "  /** The number a guest says out loud. Stable, 1-based. */",
  "  n: number;",
  "  artist: string;",
  "  title: string;",
  "  /** Script of the *artist* name — drives the HE/EN filter, not the title. */",
  "  lang: SongLang;",
  "}",
  "",
  "export const SONGS: Song[] = [",
].join("\n");

const footer = [
  "];",
  "",
  "export const TOTAL = SONGS.length;",
  "",
].join("\n");

writeFileSync("app/rosh-hashana-karaoke/_lib/songs.ts", header + "\n" + rows + "\n" + footer, "utf8");

console.log("wrote " + ordered.length + " songs | " + hebrew.length + " he + " + english.length + " en");
