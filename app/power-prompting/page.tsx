import Home from "./_components/Home";
import { buildDashboard, type Dashboard } from "./_lib/challenge";
import { getDashboard } from "./_lib/data";

// Reads the session log on every request so the bests are always current.
export const dynamic = "force-dynamic";

export default async function Page() {
  let dashboard: Dashboard = buildDashboard([]);
  let error: string | null = null;
  try {
    dashboard = await getDashboard();
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load the history.";
  }
  return <Home dashboard={dashboard} error={error} />;
}
