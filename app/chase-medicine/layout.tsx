import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import s from "./_components/chase.module.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-fraunces",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Chase 🐾",
  description: "Chase's medicine schedule.",
};

export default function ChaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${fraunces.variable} ${inter.variable} ${s.shell}`}>
      {children}
    </div>
  );
}
