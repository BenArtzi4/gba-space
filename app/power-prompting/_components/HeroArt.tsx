import PromptLine from "./PromptLine";
import s from "./power-prompting.module.css";

/**
 * The hero visual: a terminal window whose "output" is a figure doing
 * push-ups (a three-frame loop: top → mid → bottom → mid), with the
 * challenge's commands typed on the prompt line beneath it.
 * Pure SVG + CSS, no image assets. Reduced motion shows the bottom frame.
 */
export default function HeroArt() {
  return (
    <div
      className={s.terminal}
      role="img"
      aria-label="A terminal window showing a figure doing push-ups"
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
          d="M186 30 200 16 214 30"
          fill="none"
          stroke="#d97757"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={s.figureCue}
        />

        {/* Frame 1 — top of the rep: arms straight, body a rising plank */}
        <g className={`${s.pose} ${s.poseTop}`}>
          <Frame shoulder={[110, 60]} elbow={null} head={[92, 46]} />
        </g>
        {/* Frame 2 — halfway down: elbows start tucking back */}
        <g className={`${s.pose} ${s.poseMid}`}>
          <Frame shoulder={[110, 80]} elbow={[128, 98]} head={[90, 66]} />
        </g>
        {/* Frame 3 — bottom: chest just above the floor, elbows back */}
        <g className={`${s.pose} ${s.poseBottom}`}>
          <Frame shoulder={[110, 96]} elbow={[134, 104]} head={[88, 82]} />
        </g>
      </svg>
      <PromptLine />
    </div>
  );
}

const HAND: [number, number] = [106, 130];
const HEEL: [number, number] = [292, 118];
const TOES: [number, number] = [302, 130];

/** One pose of the push-up: head, plank body, feet, and the near arm. */
function Frame({
  shoulder,
  elbow,
  head,
}: {
  shoulder: [number, number];
  elbow: [number, number] | null;
  head: [number, number];
}) {
  const stroke = {
    fill: "none",
    stroke: "#fff",
    strokeWidth: 11,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const arm = elbow
    ? `M${shoulder[0]} ${shoulder[1]} L${elbow[0]} ${elbow[1]} L${HAND[0]} ${HAND[1]}`
    : `M${shoulder[0]} ${shoulder[1]} L${HAND[0]} ${HAND[1]}`;
  return (
    <>
      {/* body: shoulder → heel, straight as a plank */}
      <path d={`M${shoulder[0]} ${shoulder[1]} L${HEEL[0]} ${HEEL[1]}`} {...stroke} />
      {/* feet */}
      <path d={`M${HEEL[0]} ${HEEL[1]} L${TOES[0]} ${TOES[1]}`} {...stroke} />
      {/* near arm: hand planted under the shoulder, elbow tucks back */}
      <path d={arm} {...stroke} />
      {/* head, ahead of the shoulders, eyes on the floor */}
      <circle cx={head[0]} cy={head[1]} r="15" fill="#fff" />
    </>
  );
}
