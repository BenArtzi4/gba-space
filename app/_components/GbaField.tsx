"use client";

import { useEffect, useRef } from "react";
import {
  dotColor,
  isOffscreen,
  linkPulse,
  makeParticle,
  particleCount,
  spawnFromEdge,
  type Particle,
} from "./field";

const LETTERS = "GBA";

interface Glyph {
  char: string;
  ax: number; // anchor x
  ay: number; // anchor y
  ampX: number;
  ampY: number;
  fx: number; // drift frequency x (rad/s)
  fy: number;
  px: number; // phase offset x
  py: number;
  // resolved each frame for drawing the connecting links
  x: number;
  y: number;
}

// Short-lived sparkle left in the pointer's wake — the little reward that
// makes you want to keep moving.
interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // seconds remaining
  max: number; // initial life (for fade ratio)
  r: number;
}

// One entry per letter-to-letter connection. Periods/offsets differ so links
// appear independently and never all at once.
const LINK_DEFS = [
  { a: 0, b: 1, period: 7.5, offset: 0.0, maxAlpha: 0.5 }, // G–B
  { a: 1, b: 2, period: 9.0, offset: 3.2, maxAlpha: 0.5 }, // B–A
  { a: 0, b: 2, period: 15.0, offset: 6.1, maxAlpha: 0.22 }, // faint G–A arc
];

export default function GbaField({ fontFamily }: { fontFamily: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles: Particle[] = [];
    const glyphs: Glyph[] = [];
    let glyphSize = 0;
    const pointer = { x: 0, y: 0, active: false };
    const sparks: Spark[] = [];
    let lastSparkX = 0;
    let lastSparkY = 0;

    const POINTER_R = 175; // influence radius (CSS px)
    const LINK_DIST = 115; // max particle-particle link length near pointer
    const PARTING = 64; // max px the cursor pushes a dot aside
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);

    function buildGlyphs() {
      glyphs.length = 0;
      const size = Math.max(64, Math.min(220, Math.min(width, height) * 0.2));
      glyphSize = size;
      const cx = width / 2;
      const cy = height / 2;

      // Measure real glyph widths (the balloon font is wide) so letters are
      // spaced without overlapping — this also guarantees the G/B/A order.
      ctx!.font = `${size}px ${fontFamily}`;
      const widths = LETTERS.split("").map((c) => ctx!.measureText(c).width);
      const gap = size * 0.06;
      const total =
        widths.reduce((a, b) => a + b, 0) + gap * (LETTERS.length - 1);
      let x = cx - total / 2;
      for (let i = 0; i < LETTERS.length; i++) {
        const centerX = x + widths[i] / 2;
        glyphs.push({
          char: LETTERS[i],
          ax: centerX,
          ay: cy,
          ampX: size * 0.035, // small drift, never enough to reorder
          ampY: size * 0.06,
          fx: 0.25 + i * 0.07,
          fy: 0.35 + i * 0.05,
          px: i * 1.7,
          py: i * 2.3 + 0.6,
          x: centerX,
          y: cy,
        });
        x += widths[i] + gap;
      }
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const target = particleCount(width, height, reduced);
      particles = Array.from({ length: target }, () =>
        makeParticle(width, height),
      );
      buildGlyphs();
    }

    function resolveGlyphs(t: number) {
      for (const g of glyphs) {
        g.x = reduced ? g.ax : g.ax + Math.sin(t * g.fx + g.px) * g.ampX;
        g.y = reduced ? g.ay : g.ay + Math.sin(t * g.fy + g.py) * g.ampY;
      }
    }

    function drawScene(t: number) {
      ctx!.clearRect(0, 0, width, height);
      resolveGlyphs(t);

      // --- on-screen positions: drift + a soft "parting" push away from the
      //     pointer. This never alters velocity, so dots flow back in behind
      //     the cursor and the field never empties out. ---
      for (const p of particles) {
        if (pointer.active) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const dist = Math.hypot(dx, dy) || 0.0001;
          if (dist < POINTER_R) {
            const f = 1 - dist / POINTER_R;
            const push = f * f * PARTING;
            p.dispX = p.x + (dx / dist) * push;
            p.dispY = p.y + (dy / dist) * push;
            p.boost = f;
            continue;
          }
        }
        p.dispX = p.x;
        p.dispY = p.y;
        p.boost = 0;
      }

      // --- particles (additive glow); brighter + larger near the cursor ---
      ctx!.globalCompositeOperation = "lighter";
      for (const p of particles) {
        const a = Math.min(1, p.alpha + p.boost * 0.5);
        ctx!.beginPath();
        ctx!.fillStyle = dotColor(p.hue, a);
        ctx!.arc(p.dispX, p.dispY, p.r + p.boost * 1.1, 0, Math.PI * 2);
        ctx!.fill();
      }

      // --- sparkle trail left by the moving pointer ---
      for (const s of sparks) {
        const k = s.life / s.max;
        ctx!.beginPath();
        ctx!.fillStyle = `rgba(255, 255, 255, ${k * 0.9})`;
        ctx!.arc(s.x, s.y, s.r * k, 0, Math.PI * 2);
        ctx!.fill();
      }

      // --- soft glow halo following the cursor ---
      if (pointer.active) {
        const halo = ctx!.createRadialGradient(
          pointer.x,
          pointer.y,
          0,
          pointer.x,
          pointer.y,
          POINTER_R * 0.6,
        );
        halo.addColorStop(0, "rgba(255, 255, 255, 0.1)");
        halo.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx!.fillStyle = halo;
        ctx!.beginPath();
        ctx!.arc(pointer.x, pointer.y, POINTER_R * 0.6, 0, Math.PI * 2);
        ctx!.fill();
      }

      // --- constellation links near the pointer (using on-screen positions) ---
      if (pointer.active) {
        const near: Particle[] = [];
        for (const p of particles) {
          const dx = p.dispX - pointer.x;
          const dy = p.dispY - pointer.y;
          if (dx * dx + dy * dy < POINTER_R * POINTER_R) near.push(p);
        }
        // pointer -> particle
        for (const p of near) {
          const d = Math.hypot(p.dispX - pointer.x, p.dispY - pointer.y);
          const a = (1 - d / POINTER_R) * 0.45;
          ctx!.strokeStyle = `rgba(255, 255, 255, ${a})`;
          ctx!.lineWidth = 0.6;
          ctx!.beginPath();
          ctx!.moveTo(pointer.x, pointer.y);
          ctx!.lineTo(p.dispX, p.dispY);
          ctx!.stroke();
        }
        // particle <-> particle (only among the near set — cheap)
        for (let i = 0; i < near.length; i++) {
          for (let j = i + 1; j < near.length; j++) {
            const dx = near[i].dispX - near[j].dispX;
            const dy = near[i].dispY - near[j].dispY;
            const d2 = dx * dx + dy * dy;
            if (d2 < LINK_DIST * LINK_DIST) {
              const a = (1 - Math.sqrt(d2) / LINK_DIST) * 0.35;
              ctx!.strokeStyle = `rgba(220, 226, 238, ${a})`;
              ctx!.lineWidth = 0.5;
              ctx!.beginPath();
              ctx!.moveTo(near[i].dispX, near[i].dispY);
              ctx!.lineTo(near[j].dispX, near[j].dispY);
              ctx!.stroke();
            }
          }
        }
      }

      // --- letter-to-letter links that fade in and out over time ---
      for (const def of LINK_DEFS) {
        const phase = reduced
          ? 0.5 // hold a steady faint line in reduced-motion mode
          : (((t + def.offset) / def.period) % 1 + 1) % 1;
        const alpha =
          (reduced ? 0.12 : linkPulse(phase)) * def.maxAlpha;
        if (alpha <= 0.001) continue;
        const ga = glyphs[def.a];
        const gb = glyphs[def.b];
        ctx!.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx!.lineWidth = 1;
        ctx!.shadowBlur = 6;
        ctx!.shadowColor = `rgba(255, 255, 255, ${alpha * 0.8})`;
        ctx!.beginPath();
        ctx!.moveTo(ga.x, ga.y);
        ctx!.lineTo(gb.x, gb.y);
        ctx!.stroke();
        ctx!.shadowBlur = 0;
      }

      // --- the GBA balloon letters: glossy "silver foil balloon" look ---
      // A banded vertical gradient fakes a glossy reflection, and a soft dark
      // drop shadow lifts the puffy glyphs off the background for a 3D feel.
      ctx!.globalCompositeOperation = "source-over";
      const size = glyphSize;
      ctx!.font = `${size}px ${fontFamily}`;
      ctx!.textAlign = "center";
      ctx!.textBaseline = "middle";
      const top = height / 2 - size * 0.6;
      const grad = ctx!.createLinearGradient(0, top, 0, top + size * 1.2);
      grad.addColorStop(0.0, "#ffffff"); // top highlight
      grad.addColorStop(0.18, "#eef1f6");
      grad.addColorStop(0.44, "#c3c9d6"); // mid shade
      grad.addColorStop(0.52, "#eaeef5"); // glossy sheen band
      grad.addColorStop(0.78, "#a9b0c1"); // lower shade
      grad.addColorStop(1.0, "#d0d5df"); // bottom catch-light
      for (const g of glyphs) {
        ctx!.shadowColor = "rgba(0, 0, 0, 0.55)";
        ctx!.shadowBlur = size * 0.12;
        ctx!.shadowOffsetX = size * 0.015;
        ctx!.shadowOffsetY = size * 0.06;
        ctx!.fillStyle = grad;
        ctx!.fillText(g.char, g.x, g.y);
      }
      ctx!.shadowBlur = 0;
      ctx!.shadowOffsetX = 0;
      ctx!.shadowOffsetY = 0;
    }

    function step(dt: number) {
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // ramp opacity up so fresh arrivals visibly emerge from outside
        if (p.alpha < p.targetAlpha) {
          p.alpha = Math.min(p.targetAlpha, p.alpha + dt * 1.4);
        }

        // drift off an edge -> re-enter from a random border (steady in/out)
        if (isOffscreen(p, width, height)) {
          particles[i] = spawnFromEdge(width, height);
        }
      }

      // age the sparkle trail
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life -= dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vx *= 0.96;
        s.vy *= 0.96;
        if (s.life <= 0) sparks.splice(i, 1);
      }
    }

    // --- animation loop ---
    let rafId = 0;
    let last = performance.now();
    let running = true;

    function frame(now: number) {
      if (!running) return;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      step(dt);
      drawScene(now / 1000);
      rafId = requestAnimationFrame(frame);
    }

    // --- event handlers ---
    const onPointerMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
      if (reduced) return;
      // drop a sparkle every few px of travel (capped so it stays light)
      const dx = pointer.x - lastSparkX;
      const dy = pointer.y - lastSparkY;
      if (dx * dx + dy * dy > 64 && sparks.length < 90) {
        lastSparkX = pointer.x;
        lastSparkY = pointer.y;
        const life = rnd(0.4, 0.85);
        sparks.push({
          x: pointer.x + rnd(-3, 3),
          y: pointer.y + rnd(-3, 3),
          vx: rnd(-20, 20),
          vy: rnd(-20, 20),
          life,
          max: life,
          r: rnd(1, 2.4),
        });
      }
    };
    const onPointerLeave = () => {
      pointer.active = false;
    };
    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(rafId);
      } else if (!reduced && !running) {
        running = true;
        last = performance.now();
        rafId = requestAnimationFrame(frame);
      }
    };

    let resizeRaf = 0;
    const onResize = () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        resize();
        if (reduced) drawScene(performance.now() / 1000);
      });
    };

    resize();

    // The balloon font is a web font; make sure it's loaded, then re-measure
    // the glyph layout (and redraw, for the static reduced-motion case).
    const firstFamily = fontFamily.split(",")[0];
    if (typeof document !== "undefined" && document.fonts) {
      document.fonts.load(`64px ${firstFamily}`).catch(() => {});
      document.fonts.ready.then(() => {
        buildGlyphs();
        if (reduced) drawScene(performance.now() / 1000);
      });
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("blur", onPointerLeave);
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    if (reduced) {
      drawScene(performance.now() / 1000); // calm static render, no loop
    } else {
      rafId = requestAnimationFrame(frame);
    }

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      cancelAnimationFrame(resizeRaf);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("blur", onPointerLeave);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fontFamily]);

  return (
    <canvas
      ref={canvasRef}
      aria-label="GBA"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
      }}
    />
  );
}
