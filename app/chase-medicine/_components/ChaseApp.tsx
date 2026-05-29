"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addMedicine,
  deleteMedicine,
  getDay,
  giveDose,
  resumeMedicine,
  stopMedicine,
  undoDose,
} from "../actions";
import { localDateStr, type DayData } from "../_lib/schedule";
import s from "./chase.module.css";
import DayView from "./DayView";
import AddMedicine from "./AddMedicine";
import ManageMedicines from "./ManageMedicines";

type Tab = "today" | "add" | "manage";

export default function ChaseApp() {
  const today = localDateStr();
  const [date, setDate] = useState(today);
  const [data, setData] = useState<DayData | null>(null);
  const [tab, setTab] = useState<Tab>("today");
  const [who, setWho] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWho(localStorage.getItem("chase_who") ?? "");
  }, []);

  const refetch = useCallback(async () => {
    try {
      setData(await getDay(date));
    } catch {
      /* keep previous data on transient errors */
    }
  }, [date]);

  // initial/date-change fetch + near-live sync (poll + focus/visibility)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refetch();
    const id = setInterval(refetch, 15000);
    const onFocus = () => refetch();
    const onVis = () => {
      if (!document.hidden) refetch();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refetch]);

  function changeWho(v: string) {
    setWho(v);
    localStorage.setItem("chase_who", v);
  }

  const onGive = async (medId: string, time: string) => {
    await giveDose(medId, date, time, who.trim() || null);
    await refetch();
  };
  const onUndo = async (medId: string, time: string) => {
    await undoDose(medId, date, time);
    await refetch();
  };
  const onAdd = async (input: Parameters<typeof addMedicine>[0]) => {
    await addMedicine(input);
    await refetch();
    setTab("today");
  };
  const onStop = async (id: string) => {
    await stopMedicine(id);
    await refetch();
  };
  const onResume = async (id: string) => {
    await resumeMedicine(id);
    await refetch();
  };
  const onDelete = async (id: string) => {
    await deleteMedicine(id);
    await refetch();
  };

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div>
          <div className={s.title}>Chase 🐾</div>
          <div className={s.subtitle}>medicine schedule</div>
        </div>
      </div>

      <div className={s.whoRow}>
        <span>Giving as</span>
        <input
          className={s.input}
          style={{ width: 120, padding: "6px 10px", fontSize: 14 }}
          value={who}
          onChange={(e) => changeWho(e.target.value)}
          placeholder="your name"
          maxLength={20}
        />
      </div>

      <div className={s.tabs}>
        <button
          className={`${s.tab} ${tab === "today" ? s.tabActive : ""}`}
          onClick={() => setTab("today")}
        >
          Schedule
        </button>
        <button
          className={`${s.tab} ${tab === "add" ? s.tabActive : ""}`}
          onClick={() => setTab("add")}
        >
          Add medicine
        </button>
        <button
          className={`${s.tab} ${tab === "manage" ? s.tabActive : ""}`}
          onClick={() => setTab("manage")}
        >
          Manage
        </button>
      </div>

      {tab === "today" && (
        <DayView
          date={date}
          today={today}
          data={data}
          onPrev={() => setDate((d) => shift(d, -1))}
          onNext={() => setDate((d) => shift(d, 1))}
          onToday={() => setDate(today)}
          onGive={onGive}
          onUndo={onUndo}
        />
      )}
      {tab === "add" && <AddMedicine today={today} onAdd={onAdd} />}
      {tab === "manage" && (
        <ManageMedicines
          meds={data?.meds ?? []}
          onStop={onStop}
          onResume={onResume}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}

function shift(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return localDateStr(dt);
}
