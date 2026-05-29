"use client";

import { useState, useTransition } from "react";
import { addDays } from "../_lib/schedule";
import s from "./chase.module.css";

type Mode = "ongoing" | "days" | "range";

interface Props {
  today: string;
  onAdd: (input: {
    name: string;
    times: string[];
    startDate: string;
    endDate: string | null;
    notes: string | null;
  }) => Promise<void>;
}

export default function AddMedicine({ today, onAdd }: Props) {
  const [name, setName] = useState("");
  const [times, setTimes] = useState<string[]>(["08:00"]);
  const [mode, setMode] = useState<Mode>("ongoing");
  const [days, setDays] = useState(7);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(addDays(today, 6));
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function setTime(i: number, v: string) {
    setTimes((t) => t.map((x, j) => (j === i ? v : x)));
  }
  function addTime() {
    setTimes((t) => [...t, "20:00"]);
  }
  function removeTime(i: number) {
    setTimes((t) => (t.length > 1 ? t.filter((_, j) => j !== i) : t));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const cleanTimes = [...new Set(times.filter(Boolean))];
    if (!name.trim()) return setErr("Please enter a name.");
    if (cleanTimes.length === 0) return setErr("Add at least one time.");

    let sDate = today;
    let eDate: string | null = null;
    if (mode === "ongoing") {
      sDate = today;
      eDate = null;
    } else if (mode === "days") {
      sDate = today;
      eDate = addDays(today, Math.max(1, days) - 1);
    } else {
      sDate = startDate;
      eDate = endDate;
      if (eDate < sDate) return setErr("End date is before start date.");
    }

    start(async () => {
      try {
        await onAdd({
          name: name.trim(),
          times: cleanTimes,
          startDate: sDate,
          endDate: eDate,
          notes: notes.trim() || null,
        });
        setName("");
        setTimes(["08:00"]);
        setMode("ongoing");
        setNotes("");
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Could not save.");
      }
    });
  }

  return (
    <form onSubmit={submit}>
      <div className={s.field}>
        <label className={s.label}>Medicine name</label>
        <input
          className={s.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Oflex eye drops"
        />
      </div>

      <div className={s.field}>
        <label className={s.label}>Times each day</label>
        {times.map((t, i) => (
          <div className={s.timeRow} key={i}>
            <input
              type="time"
              className={`${s.input} ${s.timeInput}`}
              value={t}
              onChange={(e) => setTime(i, e.target.value)}
            />
            <button
              type="button"
              className={s.removeBtn}
              onClick={() => removeTime(i)}
              aria-label="Remove time"
              disabled={times.length === 1}
            >
              ×
            </button>
          </div>
        ))}
        <button type="button" className={s.smallBtn} onClick={addTime}>
          + add time
        </button>
      </div>

      <div className={s.field}>
        <label className={s.label}>For how long?</label>
        <div className={s.durationRow}>
          <button
            type="button"
            className={`${s.chip} ${mode === "ongoing" ? s.chipActive : ""}`}
            onClick={() => setMode("ongoing")}
          >
            Ongoing
          </button>
          <button
            type="button"
            className={`${s.chip} ${mode === "days" && days === 7 ? s.chipActive : ""}`}
            onClick={() => {
              setMode("days");
              setDays(7);
            }}
          >
            1 week
          </button>
          <button
            type="button"
            className={`${s.chip} ${mode === "days" && days === 14 ? s.chipActive : ""}`}
            onClick={() => {
              setMode("days");
              setDays(14);
            }}
          >
            2 weeks
          </button>
          <button
            type="button"
            className={`${s.chip} ${mode === "range" ? s.chipActive : ""}`}
            onClick={() => setMode("range")}
          >
            Pick dates
          </button>
        </div>

        {mode === "days" && (
          <div className={s.timeRow} style={{ marginTop: 10 }}>
            <input
              type="number"
              min={1}
              className={`${s.input} ${s.timeInput}`}
              value={days}
              onChange={(e) => setDays(Number(e.target.value) || 1)}
            />
            <span style={{ alignSelf: "center", color: "#8b90a0" }}>days</span>
          </div>
        )}
        {mode === "range" && (
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <input
              type="date"
              className={`${s.input} ${s.timeInput}`}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <input
              type="date"
              className={`${s.input} ${s.timeInput}`}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className={s.field}>
        <label className={s.label}>Notes (optional)</label>
        <input
          className={s.input}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. left eye, after food"
        />
      </div>

      {err && <div className={s.error}>{err}</div>}
      <button className={s.primaryBtn} disabled={pending}>
        {pending ? "Saving…" : "Add medicine"}
      </button>
    </form>
  );
}
