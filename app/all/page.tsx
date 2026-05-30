import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter } from "next/font/google";
import Gate from "./_components/Gate";
import Overview from "./_components/Overview";
import { buildOverview } from "./_lib/overview";
import s from "./_components/all.module.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "All routes · GBA",
  description: "Owner overview of every route.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const code = process.env.SPACES_CODE;
  const jar = await cookies();
  const unlocked = !!code && jar.get("all_auth")?.value === code;

  return (
    <div className={`${inter.variable} ${s.shell}`}>
      {unlocked ? <Overview data={buildOverview()} /> : <Gate />}
    </div>
  );
}
