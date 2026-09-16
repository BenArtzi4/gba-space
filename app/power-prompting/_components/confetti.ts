// A tiny canvas confetti burst for "new best" moments. No dependencies.
// Two cannons fire from the bottom corners toward the middle of the screen.

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  vr: number;
  color: string;
}

export function burstConfetti(
  colors: string[],
  opts: { count?: number; durationMs?: number } = {},
): void {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const count = opts.count ?? 140;
  const durationMs = opts.durationMs ?? 2200;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = window.innerWidth;
  const H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: "9999",
  } as Partial<CSSStyleDeclaration>);
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  ctx.scale(dpr, dpr);

  const pieces: Piece[] = [];
  const palette = colors.length ? colors : ["#0071e3", "#d97757", "#34c759"];
  for (let i = 0; i < count; i++) {
    const left = i % 2 === 0;
    const angle = (left ? -60 : -120) + (Math.random() - 0.5) * 40; // degrees
    const speed = 11 + Math.random() * 9;
    const rad = (angle * Math.PI) / 180;
    pieces.push({
      x: left ? 0 : W,
      y: H,
      vx: Math.cos(rad) * speed,
      vy: Math.sin(rad) * speed,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      color: palette[i % palette.length],
    });
  }

  const start = performance.now();
  let raf = 0;
  const tick = (now: number) => {
    const t = now - start;
    ctx.clearRect(0, 0, W, H);
    const fade = t > durationMs - 500 ? Math.max(0, (durationMs - t) / 500) : 1;
    for (const p of pieces) {
      p.vy += 0.32; // gravity
      p.vx *= 0.99;
      p.vy *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (t < durationMs) {
      raf = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(raf);
      canvas.remove();
    }
  };
  raf = requestAnimationFrame(tick);
}
