"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { login } from "../actions";
import { USERS, USER_COLORS, type User } from "../_lib/arena";
import s from "./app-arena.module.css";

export default function Gate() {
  const [who, setWho] = useState<User | null>(null);
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!who) return;
    setErr(false);
    start(async () => {
      const res = await login(who, password);
      if (res.ok) router.refresh();
      else setErr(true);
    });
  }

  return (
    <div className={s.gate}>
      <form className={s.gateCard} onSubmit={submit}>
        <div className={s.gateLogo}>🏆</div>
        <h1 className={s.gateTitle}>App Arena</h1>
        <p className={s.gateTagline}>Pitch it. Rate it. Crown it.</p>

        <div className={s.gateLabel}>Who are you?</div>
        <div className={s.nameRow}>
          {USERS.map((u) => (
            <button
              key={u}
              type="button"
              className={`${s.nameBtn} ${who === u ? s.nameBtnActive : ""}`}
              style={
                {
                  "--accent": USER_COLORS[u],
                } as React.CSSProperties
              }
              onClick={() => {
                setWho(u);
                setErr(false);
              }}
            >
              <span className={s.nameDot} style={{ background: USER_COLORS[u] }} />
              {u}
            </button>
          ))}
        </div>

        <input
          className={s.passInput}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="current-password"
        />

        {err && <div className={s.gateError}>Wrong name or password.</div>}

        <button
          className={s.loginBtn}
          disabled={pending || !who || !password}
        >
          {pending ? "Entering…" : "Enter the arena"}
        </button>
      </form>
    </div>
  );
}
