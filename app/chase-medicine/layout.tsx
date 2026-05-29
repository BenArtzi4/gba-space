import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chase 🐾",
  description: "Chase's medicine schedule.",
};

export default function ChaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
