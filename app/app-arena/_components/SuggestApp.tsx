"use client";

import { useState, useTransition } from "react";
import { addIdea } from "../actions";
import s from "./app-arena.module.css";

export default function SuggestApp({
  onAdded,
}: {
  onAdded: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!title.trim()) {
      setErr("Give your app a name.");
      return;
    }
    start(async () => {
      try {
        await addIdea({ title, description });
        setTitle("");
        setDescription("");
        await onAdded();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <form className={s.suggestForm} onSubmit={submit}>
      <h2 className={s.suggestHeading}>Pitch a new app idea 💡</h2>
      <p className={s.suggestHint}>
        The other two will score it 1–100. Make it count.
      </p>

      <div className={s.field}>
        <label className={s.label}>App name</label>
        <input
          className={s.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Dog-walk matchmaker"
          maxLength={120}
          autoFocus
        />
      </div>

      <div className={s.field}>
        <label className={s.label}>The pitch</label>
        <textarea
          className={s.textarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does it do? Why is it amazing?"
          maxLength={1000}
          rows={4}
        />
      </div>

      {err && <div className={s.gateError}>{err}</div>}

      <button className={s.submitBtn} disabled={pending || !title.trim()}>
        {pending ? "Launching…" : "Add to the arena"}
      </button>
    </form>
  );
}
