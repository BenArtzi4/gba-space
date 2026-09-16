import s from "./_components/power-prompting.module.css";

// Instant skeleton shown while a server-rendered page (home / history) loads,
// so navigation feels immediate instead of freezing on the previous screen.
export default function Loading() {
  return (
    <main className={s.page} aria-busy="true" aria-label="Loading">
      <div className={s.topbar}>
        <span className={`${s.skel} ${s.skelBrand}`} />
        <span className={`${s.skel} ${s.skelNav}`} />
      </div>
      <div className={s.hero}>
        <div className={`${s.skel} ${s.skelHero}`} />
        <div className={`${s.skel} ${s.skelTitle}`} />
        <div className={`${s.skel} ${s.skelBtn}`} />
      </div>
      <div className={s.bestGrid}>
        <div className={`${s.skel} ${s.skelCard}`} />
        <div className={`${s.skel} ${s.skelCard}`} />
      </div>
    </main>
  );
}
