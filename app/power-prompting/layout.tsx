import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import s from "./_components/power-prompting.module.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Power Prompting",
  description:
    "Bring Sally Up push-up challenge tracker for Gal & Ofir: start the song, survive, log the time.",
  // Unlisted space: reachable by URL, kept out of search engines.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#f5f5f7",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${inter.variable} ${mono.variable} ${s.shell}`}>
      {children}
    </div>
  );
}
