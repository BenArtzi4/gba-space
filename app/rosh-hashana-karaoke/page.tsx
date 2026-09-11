import Karaoke from "./_components/Karaoke";
import { SONGS } from "./_lib/songs";

// Fully static: the catalogue is a compile-time constant, so there is nothing
// to fetch, nothing to fail, and nothing to be slow on the night.
export default function Page() {
  return <Karaoke songs={SONGS} />;
}
