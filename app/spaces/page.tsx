import Link from "next/link";
import { publicSpaces } from "../_lib/spaces";
import s from "./_components/directory.module.css";

export const metadata = {
  title: "Spaces · GBA",
};

export default function SpacesDirectory() {
  const list = publicSpaces();

  return (
    <main className={s.main}>
      <header className={s.head}>
        <Link href="/" className={s.back}>
          ← GBA
        </Link>
        <h1 className={s.title}>Spaces</h1>
        <p className={s.lede}>
          Little corners of the internet that live here.
        </p>
      </header>

      {list.length === 0 ? (
        <p className={s.empty}>Nothing public yet — check back soon.</p>
      ) : (
        <ul className={s.grid}>
          {list.map((space) => (
            <li key={space.slug}>
              <Link href={`/${space.slug}`} className={s.card}>
                <span className={s.cardTitle}>
                  {space.emoji ? `${space.emoji} ` : ""}
                  {space.title}
                </span>
                <span className={s.cardDesc}>{space.description}</span>
                <span className={s.cardSlug}>/{space.slug}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
