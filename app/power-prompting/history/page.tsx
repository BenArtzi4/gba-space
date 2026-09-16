import type { Metadata } from "next";
import History from "../_components/History";
import { computeStats, type SessionRow } from "../_lib/challenge";
import { listSessions } from "../_lib/data";

export const metadata: Metadata = {
  title: "History · Power Prompting",
};

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  let sessions: SessionRow[] = [];
  let error: string | null = null;
  try {
    sessions = await listSessions();
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load the history.";
  }
  return (
    <History sessions={sessions} stats={computeStats(sessions)} error={error} />
  );
}
