"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Song } from "../_lib/songs";
import { isNumericQuery, normalize } from "../_lib/search";
import {
  CLOSING_BLESSING,
  FACTS,
  FAMILIES_GREETING,
  GREETINGS,
  GREETING_EMOJI,
  HEBREW_YEAR,
  HERO_LINE,
  SIMANIM,
} from "../_lib/content";
import { burstSeeds } from "./seeds";
import s from "./rosh-hashana-karaoke.module.css";

type Filter = "all" | "he" | "en";

/** Unicode has no pomegranate emoji, so the siman gets a real drawing. */
function Rimon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M12 4.2c-1.1-1.5-2.2-2.2-3.4-2.4.6 1.2.9 2.2.9 3.1"
        fill="none"
        stroke="#5F8C33"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M12 4c4.1 0 7 3.2 7 7.4 0 5-3.2 9-7 9s-7-4-7-9C5 7.2 7.9 4 12 4Z"
        fill="#C0243C"
      />
      <path
        d="M12 4c-2.1 1.7-3.2 4.3-3.2 7.4 0 3.6 1.2 6.8 3.2 9-3.8 0-7-4-7-9C5 7.2 7.9 4 12 4Z"
        fill="#E3364F"
        opacity="0.5"
      />
      <circle cx="10.2" cy="11.4" r="1.05" fill="#FFD3DA" />
      <circle cx="13.8" cy="11.4" r="1.05" fill="#FFD3DA" />
      <circle cx="12" cy="14.6" r="1.05" fill="#FFD3DA" />
    </svg>
  );
}

interface Prepared extends Song {
  haystack: string;
}

interface Group {
  artist: string;
  songs: Prepared[];
}

export default function Karaoke({ songs }: { songs: Song[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [flashed, setFlashed] = useState<number | null>(null);

  // Picked on the client only. Choosing randomly during render would produce
  // different markup on the server and trip a hydration mismatch.
  const [greetingIndex, setGreetingIndex] = useState(0);
  const [factIndex, setFactIndex] = useState(0);

  useEffect(() => {
    setGreetingIndex(Math.floor(Math.random() * GREETINGS.length));
    setFactIndex(Math.floor(Math.random() * FACTS.length));
  }, []);

  // Normalise once, not on every keystroke.
  const prepared = useMemo<Prepared[]>(
    () =>
      songs.map((song) => ({
        ...song,
        haystack: normalize(`${song.artist} ${song.title}`),
      })),
    [songs],
  );

  const counts = useMemo(
    () => ({
      all: prepared.length,
      he: prepared.filter((song) => song.lang === "he").length,
      en: prepared.filter((song) => song.lang === "en").length,
    }),
    [prepared],
  );

  const matches = useMemo(() => {
    const byLang =
      filter === "all"
        ? prepared
        : prepared.filter((song) => song.lang === filter);

    const trimmed = query.trim();
    if (!trimmed) return byLang;

    // A bare number means "show me song N" — guests hear a number called out
    // and want to know what is coming.
    if (isNumericQuery(trimmed)) {
      const n = Number(trimmed);
      const exact = byLang.filter((song) => song.n === n);
      if (exact.length > 0) return exact;
      return byLang.filter((song) => String(song.n).startsWith(trimmed));
    }

    const needle = normalize(trimmed);
    return byLang.filter((song) => song.haystack.includes(needle));
  }, [prepared, filter, query]);

  const groups = useMemo<Group[]>(() => {
    const out: Group[] = [];
    for (const song of matches) {
      const last = out[out.length - 1];
      if (last && last.artist === song.artist) last.songs.push(song);
      else out.push({ artist: song.artist, songs: [song] });
    }
    return out;
  }, [matches]);

  const surpriseMe = useCallback(() => {
    const pool = matches.length > 0 ? matches : prepared;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (!pick) return;

    // The greeting re-rolls too, so the page feels like it is playing along.
    setGreetingIndex((i) => (i + 1) % GREETINGS.length);

    const row = document.getElementById(`rhk-song-${pick.n}`);
    row?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "center",
    });

    // The highlight is also the reduced-motion stand-in for the seed burst, so
    // the button still visibly does something when animation is suppressed.
    setFlashed(pick.n);
    window.setTimeout(() => {
      setFlashed((current) => (current === pick.n ? null : current));
    }, 2200);

    const rect = row?.getBoundingClientRect();
    burstSeeds(
      rect ? rect.left + rect.width / 2 : undefined,
      rect ? rect.top + rect.height / 2 : undefined,
    );
  }, [matches, prepared]);

  const resultLabel =
    query.trim() || filter !== "all"
      ? `${matches.length} מתוך ${counts.all} שירים`
      : `${counts.all} שירים · ${counts.he} בעברית · ${counts.en} באנגלית`;

  return (
    <div className={s.page}>
      <header className={s.header}>
        <p className={s.kicker}>
          <span aria-hidden="true">✨</span>
          ראש השנה {HEBREW_YEAR}
          <span aria-hidden="true">✨</span>
        </p>

        <h1 className={s.title}>
          <span className={s.titleMark} aria-hidden="true">
            🎤
          </span>
          קריוקי
        </h1>

        <p className={s.greeting}>
          {GREETINGS[greetingIndex]}
          <span className={s.greetingEmoji} aria-hidden="true">
            {GREETING_EMOJI}
          </span>
        </p>
        <p className={s.families}>{FAMILIES_GREETING}</p>
        <p className={s.hero}>{HERO_LINE}</p>

        <ul className={s.simanim}>
          {SIMANIM.map((siman) => (
            <li key={siman.label} className={s.siman} title={siman.wish}>
              {siman.icon === "rimon" ? (
                <Rimon className={s.simanSvg} />
              ) : (
                <span className={s.simanEmoji} aria-hidden="true">
                  {siman.icon}
                </span>
              )}
              <span className={s.simanLabel}>{siman.label}</span>
            </li>
          ))}
        </ul>
      </header>

      <div className={s.controls}>
        <div className={s.searchRow}>
          <div className={s.searchField}>
            <span className={s.searchIcon} aria-hidden="true">
              🔎
            </span>
            <input
              // dir stays rtl: dir="auto" on an input recomputes from the value
              // and would flip the field mid-typing.
              dir="rtl"
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className={s.searchInput}
              placeholder="חיפוש לפי זמר, שיר או מספר…"
              aria-label="חיפוש שיר"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button
                type="button"
                className={s.clearButton}
                onClick={() => setQuery("")}
                aria-label="ניקוי החיפוש"
              >
                ✕
              </button>
            )}
          </div>

          <button type="button" className={s.surprise} onClick={surpriseMe}>
            🎉 הפתיעו אותי
          </button>
        </div>

        <div className={s.filterRow}>
          <div className={s.chips} role="group" aria-label="סינון לפי שפה">
            {(
              [
                ["all", `הכל ${counts.all}`],
                ["he", `עברית ${counts.he}`],
                ["en", `אנגלית ${counts.en}`],
              ] as [Filter, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`${s.chip} ${filter === value ? s.chipOn : ""}`}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <p className={s.count}>{resultLabel}</p>
        </div>
      </div>

      <div className={s.list}>
        {groups.length === 0 ? (
          <div className={s.empty}>
            <p className={s.emptyEmoji} aria-hidden="true">
              🍯
            </p>
            <p className={s.emptyTitle}>אין שיר כזה ברשימה</p>
            <p className={s.emptyBody}>נסו חיפוש אחר — או תנו לגורל להחליט.</p>
            <button
              type="button"
              className={s.surprise}
              onClick={() => {
                setQuery("");
                setFilter("all");
                surpriseMe();
              }}
            >
              🎉 הפתיעו אותי
            </button>
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.artist} className={s.group}>
              <h2 className={s.artist} dir="auto">
                {group.artist}
              </h2>
              <ul className={s.songs}>
                {group.songs.map((song) => (
                  <li
                    key={song.n}
                    id={`rhk-song-${song.n}`}
                    className={`${s.row} ${flashed === song.n ? s.rowFlash : ""}`}
                  >
                    <span className={s.badge}>{song.n}</span>
                    <span className={s.rowText}>
                      {/* dir="auto" resolves per row, so the English titles
                          read left-to-right inside an otherwise RTL list. */}
                      <span className={s.songTitle} dir="auto">
                        {song.title}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      <footer className={s.footer}>
        <p className={s.fact}>
          <span className={s.factLabel}>ידעתם?</span> {FACTS[factIndex]}
        </p>
        <p className={s.blessing}>{CLOSING_BLESSING}</p>
        <p className={s.signoff} aria-hidden="true">
          🍎 🍯 🎤 📯
        </p>
      </footer>
    </div>
  );
}
