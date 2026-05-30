import type { Metadata } from "next";
import { Inter } from "next/font/google";
import s from "./_components/directory.module.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Spaces · GBA",
  description: "A directory of the little corners that live under GBA.",
};

export default function SpacesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={`${inter.variable} ${s.shell}`}>{children}</div>;
}
