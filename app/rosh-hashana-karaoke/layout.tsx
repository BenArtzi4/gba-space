import type { Metadata } from "next";
import { Heebo, Suez_One } from "next/font/google";
import s from "./_components/rosh-hashana-karaoke.module.css";

// Both faces MUST request the "hebrew" subset. With only "latin", next/font
// serves a Latin-range file and every Hebrew glyph silently falls back to the
// system font — no error, just a page that looks subtly wrong.
//
// Heebo is left without an explicit `weight` so next/font serves the variable
// font: one file per subset covering 100–900 instead of one file per weight.
const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  display: "swap",
  variable: "--font-heebo",
});

// Suez One ships a single weight (400) — display text only.
const suez = Suez_One({
  subsets: ["hebrew", "latin"],
  weight: "400",
  display: "swap",
  variable: "--font-suez",
});

const title = "קריוקי ראש השנה תשפ״ז";
const description =
  "רשימת שירי הקריוקי שלנו לראש השנה — 112 שירים. בחרו מספר ותגידו אותו בקול.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: "website" },
};

export default function KaraokeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // dir/lang live here, on the space's own wrapper — never on the shared root
  // layout, which would flip every other space in the repo.
  return (
    <div
      dir="rtl"
      lang="he"
      className={`${heebo.variable} ${suez.variable} ${s.shell}`}
    >
      {children}
    </div>
  );
}
