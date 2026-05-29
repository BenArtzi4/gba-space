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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
