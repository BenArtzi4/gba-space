import { cookies } from "next/headers";
import Gate from "./_components/Gate";
import ChaseApp from "./_components/ChaseApp";

export const dynamic = "force-dynamic";

export default async function Page() {
  const code = process.env.CHASE_CODE;
  const jar = await cookies();
  const unlocked = !!code && jar.get("chase_auth")?.value === code;
  return unlocked ? <ChaseApp /> : <Gate />;
}
