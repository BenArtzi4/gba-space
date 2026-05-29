// Pure simulation helpers for the GBA particle field.
// No DOM/canvas access here — just data + math, so the logic is easy to reason about.

export interface Particle {
  x: number;
  y: number;
  vx: number; // CSS px / second
  vy: number;
  r: number; // radius in CSS px
  /** 0 = pure white, 1 = soft silver; used to lerp the dot colour. */
  hue: number;
  alpha: number; // current opacity (ramps up after spawning)
  targetAlpha: number; // opacity it settles at once fully emerged
}

// Clean, classic palette — white through cool silver. No colour cast.
const WHITE: [number, number, number] = [255, 255, 255];
const SILVER: [number, number, number] = [196, 202, 214];

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** rgba() string for a particle's colour at a given alpha. */
export function dotColor(hue: number, alpha: number): string {
  const r = Math.round(WHITE[0] + (SILVER[0] - WHITE[0]) * hue);
  const g = Math.round(WHITE[1] + (SILVER[1] - WHITE[1]) * hue);
  const b = Math.round(WHITE[2] + (SILVER[2] - WHITE[2]) * hue);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Particle count scaled to viewport area, capped, halved for reduced motion. */
export function particleCount(w: number, h: number, reduced: boolean): number {
  const n = Math.round((w * h) / 8000);
  const capped = Math.max(60, Math.min(240, n));
  return reduced ? Math.round(capped / 2) : capped;
}

function randomVelocity(): { vx: number; vy: number } {
  const angle = rand(0, Math.PI * 2);
  const speed = rand(6, 22); // slow drift
  return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
}

/** A particle placed anywhere in the viewport (used on first build). */
export function makeParticle(w: number, h: number): Particle {
  const targetAlpha = rand(0.18, 0.6);
  return {
    x: rand(0, w),
    y: rand(0, h),
    ...randomVelocity(),
    r: rand(0.5, 2.0),
    hue: Math.random(),
    alpha: targetAlpha, // already on screen
    targetAlpha,
  };
}

/**
 * A particle entering from a random border, heading inward — a fresh arrival.
 * Starts fully transparent so it visibly emerges from outside the page.
 */
export function spawnFromEdge(w: number, h: number): Particle {
  const edge = Math.floor(rand(0, 4)); // 0 top, 1 right, 2 bottom, 3 left
  const speed = rand(8, 24);
  let x = 0;
  let y = 0;
  let vx = 0;
  let vy = 0;
  const spread = rand(-0.5, 0.5); // small angular wobble off straight-in
  switch (edge) {
    case 0: // top, moving down
      x = rand(0, w);
      y = -8;
      vx = Math.sin(spread) * speed;
      vy = Math.cos(spread) * speed;
      break;
    case 1: // right, moving left
      x = w + 8;
      y = rand(0, h);
      vx = -Math.cos(spread) * speed;
      vy = Math.sin(spread) * speed;
      break;
    case 2: // bottom, moving up
      x = rand(0, w);
      y = h + 8;
      vx = Math.sin(spread) * speed;
      vy = -Math.cos(spread) * speed;
      break;
    default: // left, moving right
      x = -8;
      y = rand(0, h);
      vx = Math.cos(spread) * speed;
      vy = Math.sin(spread) * speed;
      break;
  }
  const targetAlpha = rand(0.18, 0.6);
  return {
    x,
    y,
    vx,
    vy,
    r: rand(0.5, 2.0),
    hue: Math.random(),
    alpha: 0, // fades in as it enters
    targetAlpha,
  };
}

/** True once a particle has fully left the viewport (with margin). */
export function isOffscreen(p: Particle, w: number, h: number): boolean {
  const m = 16;
  return p.x < -m || p.x > w + m || p.y < -m || p.y > h + m;
}

/**
 * A 0..1 pulse used for the letter-to-letter links: stays at 0 most of the
 * cycle, then fades in, holds, and fades out — so a line "sometimes" appears
 * and then disappears. `phase` is expected in [0, 1).
 */
export function linkPulse(phase: number): number {
  const fadeIn = 0.08;
  const hold = 0.06;
  const fadeOut = 0.12;
  if (phase < fadeIn) return phase / fadeIn;
  if (phase < fadeIn + hold) return 1;
  if (phase < fadeIn + hold + fadeOut) {
    return 1 - (phase - fadeIn - hold) / fadeOut;
  }
  return 0; // long quiet gap
}
