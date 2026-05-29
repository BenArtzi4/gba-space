import { Bagel_Fat_One } from "next/font/google";
import GbaField from "./_components/GbaField";

// Puffy, inflated, balloon-style display font (SIL Open Font License — free to
// self-host and deploy). Next.js self-hosts and preloads it.
const balloon = Bagel_Fat_One({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export default function Home() {
  return (
    <main className={balloon.className}>
      <GbaField fontFamily={balloon.style.fontFamily} />
    </main>
  );
}
