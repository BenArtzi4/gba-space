import { cookies } from "next/headers";
import Gate from "./_components/Gate";
import ArenaApp from "./_components/ArenaApp";
import { COOKIE, verifyIdentity } from "./_lib/auth";

export const dynamic = "force-dynamic";

export default async function Page() {
  const jar = await cookies();
  const me = verifyIdentity(jar.get(COOKIE)?.value);
  return me ? <ArenaApp me={me} /> : <Gate />;
}
