"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { unlock } from "../actions";
import s from "./all.module.css";

export default function Gate() {
  const [code, setCode] = useState("");
  const [err, setErr] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(false);
    start(async () => {
      const res = await unlock(code);
      if (res.ok) router.refresh();
      else setErr(true);
    });
  }

  return (
    <div className={s.gate}>
      <div className={s.gateMark}>◆</div>
      <div className={s.gateSub}>Owner overview — enter the code</div>
      <form onSubmit={submit} className={s.gateForm}>
        <input
          className={s.input}
          type="password"
          inputMode="numeric"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="passcode"
          autoFocus
        />
        {err && <div className={s.error}>Wrong code, try again.</div>}
        <button className={s.primaryBtn} disabled={pending || !code}>
          {pending ? "Checking…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}
