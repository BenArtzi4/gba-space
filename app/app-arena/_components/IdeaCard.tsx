"use client";

import { useState, useTransition } from "react";
import { deleteIdea, editIdea, scoreIdea, toggleReaction } from "../actions";
import {
  medalFor,
  scoreColor,
  USERS,
  USER_COLORS,
  type RankedIdea,
  type User,
} from "../_lib/arena";
import s from "./app-arena.module.css";
import ScoreSlider from "./ScoreSlider";

export default function IdeaCard({
  ranked,
  refresh,
}: {
  ranked: RankedIdea;
  refresh: () => Promise<void>;
}) {
  const { idea, avg, voteCount, maxVotes, scores, reactions } = ranked;
  const by = idea.suggested_by as User;
  const medal = medalFor(ranked.rank);

  const [editingScore, setEditingScore] = useState(false);
  const [editingIdea, setEditingIdea] = useState(false);
  const [eTitle, setETitle] = useState(idea.title);
  const [eDesc, setEDesc] = useState(idea.description ?? "");
  const [pending, start] = useTransition();

  // Who still owes this idea a score (only meaningful to its author).
  const waitingOn = USERS.filter(
    (u) => u !== by && !scores.some((sc) => sc.voter === u),
  );

  async function onScore(score: number) {
    await scoreIdea(idea.id, score);
    await refresh();
    setEditingScore(false);
  }

  function react(emoji: string) {
    start(async () => {
      await toggleReaction(idea.id, emoji);
      await refresh();
    });
  }

  function saveEdit() {
    start(async () => {
      await editIdea(idea.id, { title: eTitle, description: eDesc });
      await refresh();
      setEditingIdea(false);
    });
  }

  function remove() {
    if (!window.confirm("Delete this idea and all its scores?")) return;
    start(async () => {
      await deleteIdea(idea.id);
      await refresh();
    });
  }

  return (
    <article className={`${s.card} ${ranked.rank === 1 ? s.cardTop : ""}`}>
      <div className={s.cardRank}>
        {medal ? (
          <span className={s.rankMedal}>{medal}</span>
        ) : (
          <span className={s.rankNum}>#{ranked.rank}</span>
        )}
      </div>

      <div className={s.cardMain}>
        {editingIdea ? (
          <div className={s.editIdea}>
            <input
              className={s.input}
              value={eTitle}
              onChange={(e) => setETitle(e.target.value)}
              maxLength={120}
            />
            <textarea
              className={s.textarea}
              value={eDesc}
              onChange={(e) => setEDesc(e.target.value)}
              maxLength={1000}
              rows={3}
            />
            <div className={s.editActions}>
              <button
                className={s.smallPrimary}
                onClick={saveEdit}
                disabled={pending || !eTitle.trim()}
              >
                Save
              </button>
              <button
                className={s.smallGhost}
                onClick={() => {
                  setEditingIdea(false);
                  setETitle(idea.title);
                  setEDesc(idea.description ?? "");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className={s.cardHead}>
              <h3 className={s.ideaTitle}>{idea.title}</h3>
              <span
                className={s.byBadge}
                style={
                  {
                    "--accent": USER_COLORS[by] ?? "#999",
                  } as React.CSSProperties
                }
              >
                {idea.suggested_by}
              </span>
            </div>
            {idea.description && (
              <p className={s.ideaDesc}>{idea.description}</p>
            )}
          </>
        )}

        {/* Score summary */}
        <div className={s.scoreRow}>
          <div
            className={s.avgNum}
            style={{ color: avg !== null ? scoreColor(avg) : "var(--muted)" }}
          >
            {avg !== null ? Math.round(avg) : "—"}
          </div>
          <div className={s.scoreMeta}>
            <span className={s.voteCount}>
              {voteCount}/{maxVotes} {voteCount === 1 ? "vote" : "votes"}
            </span>
            <div className={s.breakdown}>
              {scores.map((sc) => (
                <span
                  key={sc.id}
                  className={s.scoreChip}
                  style={{
                    color: USER_COLORS[sc.voter as User] ?? "var(--muted)",
                  }}
                >
                  {sc.voter} {sc.score}
                </span>
              ))}
              {scores.length === 0 && (
                <span className={s.noVotes}>Awaiting scores…</span>
              )}
            </div>
          </div>
          {ranked.awaitingMe && !editingScore && (
            <span className={s.awaiting}>
              <span className={s.awaitingPulse} />
              Your turn
            </span>
          )}
        </div>

        {/* Scoring controls */}
        {ranked.canScore ? (
          ranked.myScore === null || editingScore ? (
            <ScoreSlider initial={ranked.myScore} onSubmit={onScore} />
          ) : (
            <div className={s.scored}>
              <span>
                You scored{" "}
                <strong style={{ color: scoreColor(ranked.myScore) }}>
                  {ranked.myScore}
                </strong>
              </span>
              <button
                className={s.smallGhost}
                onClick={() => setEditingScore(true)}
              >
                Change
              </button>
            </div>
          )
        ) : (
          <div className={s.ownerNote}>
            {waitingOn.length > 0 ? (
              <>Waiting for {waitingOn.join(" & ")} to score…</>
            ) : (
              <>Both scores are in 🎉</>
            )}
          </div>
        )}

        {/* Emoji reactions — the way to react to a friend's pitch */}
        <div className={s.reactions}>
          {reactions.map((r) => (
            <button
              key={r.emoji}
              type="button"
              className={`${s.reactionBtn} ${r.byMe ? s.reactionActive : ""}`}
              onClick={() => react(r.emoji)}
              disabled={pending}
              title={r.who.length ? r.who.join(", ") : "React"}
            >
              <span className={s.reactionEmoji}>{r.emoji}</span>
              {r.count > 0 && (
                <span className={s.reactionCount}>{r.count}</span>
              )}
            </button>
          ))}
          {ranked.iSuggested && !editingIdea && (
            <span className={s.ownerControls}>
              <button
                className={s.iconBtn}
                onClick={() => setEditingIdea(true)}
                aria-label="Edit idea"
              >
                ✏️
              </button>
              <button
                className={`${s.iconBtn} ${s.danger}`}
                onClick={remove}
                aria-label="Delete idea"
              >
                🗑️
              </button>
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
