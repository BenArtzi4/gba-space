import type { Metadata } from "next";
import "./globals.css";

const description = "A small, ever-moving corner of the internet.";

export const metadata: Metadata = {
  metadataBase: new URL("https://gba-space.vercel.app"),
  title: "GBA",
  description,
  openGraph: {
    title: "GBA",
    description,
    url: "/",
    siteName: "GBA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GBA",
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Browser extensions (Grammarly, and similar) inject attributes onto <html>
    // and <body> before React hydrates, which React then reports as a mismatch.
    // Verified: the server HTML ships these tags bare. Suppression is scoped to
    // these two elements' attributes only — it does not hide real mismatches in
    // the tree below.
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
