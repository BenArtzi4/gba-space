import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import s from "./_components/app-arena.module.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "App Arena 🏆",
  description: "Pitch app ideas, score them 1–100, climb the leaderboard.",
};

export default function ArenaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${spaceGrotesk.variable} ${inter.variable} ${s.shell}`}>
      {children}
    </div>
  );
}
