// Pomegranate-seed burst. Adapted from the confetti in app/app-arena — copied
// deliberately rather than imported, because spaces never reach into each
// other's folders.
//
// Differences from the original: seeds are drawn as teardrop-ish ellipses in
// pomegranate/honey tones rather than rectangles in party colours, and they
// tumble a little more slowly so they read as fruit rather than paper.

// Deep enough to stay visible against the white page — pale honey washes out.
const COLORS = ["#D8304A", "#A81B30", "#F0562F", "#E8873A", "#C9962A", "#6F9F3F"];

interface Seed {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rot: number;
  vrot: number;
  life: number;
}

export function burstSeeds(originX?: number, originY?: number): void {
  if (typeof window === "undefined") return;
  // Respect the OS setting — the caller substitutes a static highlight instead.
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: "9999",
  });
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }
  ctx.scale(dpr, dpr);

  const cx = originX ?? w / 2;
  const cy = originY ?? h / 2.6;
  const count = 140;
  const seeds: Seed[] = Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 8;
    return {
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3.5,
      size: 4 + Math.random() * 5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rot: Math.random() * Math.PI,
      vrot: (Math.random() - 0.5) * 0.25,
      life: 1,
    };
  });

  const gravity = 0.2;
  const drag = 0.985;
  let frame = 0;

  function tick() {
    frame++;
    ctx!.clearRect(0, 0, w, h);
    let alive = false;
    for (const p of seeds) {
      p.vx *= drag;
      p.vy = p.vy * drag + gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;
      p.life -= 0.011;
      if (p.life > 0 && p.y < h + 40) {
        alive = true;
        ctx!.save();
        ctx!.globalAlpha = Math.max(0, p.life);
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.rot);
        ctx!.fillStyle = p.color;
        // A seed: rounder than confetti, slightly taller than wide.
        ctx!.beginPath();
        ctx!.ellipse(0, 0, p.size * 0.42, p.size * 0.62, 0, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.restore();
      }
    }
    if (alive && frame < 240) {
      requestAnimationFrame(tick);
    } else {
      canvas.remove();
    }
  }
  requestAnimationFrame(tick);
}
