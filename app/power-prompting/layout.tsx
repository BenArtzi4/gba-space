import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import s from "./_components/power-prompting.module.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-mono",
});

const title = "Power Prompting";
const description = "Bring Sally up. Then hold.";

export const metadata: Metadata = {
  title,
  description,
  // Unlisted space: reachable by URL, kept out of search engines.
  robots: { index: false, follow: false },
  // Link previews (WhatsApp, iMessage, Slack) read these; the image comes
  // from ./opengraph-image.tsx automatically.
  openGraph: {
    title,
    description,
    url: "/power-prompting",
    siteName: "GBA",
    type: "website",
  },
  twitter: { card: "summary_large_image", title, description },
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
