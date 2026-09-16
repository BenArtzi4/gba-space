import PromptLine from "./PromptLine";
import s from "./power-prompting.module.css";

/**
 * The hero visual: a terminal window whose "output" is a push-up figure,
 * with the challenge's commands typed on the prompt line beneath it.
 * Pure SVG + CSS, no image assets.
 */
export default function HeroArt() {
  return (
    <div
      className={s.terminal}
      role="img"
      aria-label="A terminal window showing a push-up figure"
    >
      <div className={s.terminalBar} aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <svg className={s.figure} viewBox="0 0 340 150" aria-hidden>
        {/* ground */}
        <line
          x1="26"
          y1="134"
          x2="314"
          y2="134"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="2 10"
        />
        {/* the "up" cue — a Claude-orange chevron above the back */}
        <path
          d="M156 46 170 32 184 46"
          fill="none"
          stroke="#d97757"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={s.figureCue}
        />
        {/* body: shoulder → heel, straight as a plank */}
        <path
          d="M84 84 L286 118"
          fill="none"
          stroke="#fff"
          strokeWidth="11"
          strokeLinecap="round"
        />
        {/* feet */}
        <path
          d="M286 118 L298 130"
          fill="none"
          stroke="#fff"
          strokeWidth="11"
          strokeLinecap="round"
        />
        {/* arm, bent at the bottom of the rep */}
        <path
          d="M84 84 L60 110 L92 130"
          fill="none"
          stroke="#fff"
          strokeWidth="11"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* head */}
        <circle cx="66" cy="66" r="15" fill="#fff" />
      </svg>
      <PromptLine />
    </div>
  );
}
