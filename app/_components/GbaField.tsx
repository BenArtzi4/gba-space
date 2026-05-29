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

// One entry per letter-to-letter connection. Periods/offsets differ so links
// appear independently and never all at once.
const LINK_DEFS = [
  { a: 0, b: 1, period: 7.5, offset: 0.0, maxAlpha: 0.5 }, // G–B
  { a: 1, b: 2, period: 9.0, offset: 3.2, maxAlpha: 0.5 }, // B–A
  { a: 0, b: 2, period: 15.0, offset: 6.1, maxAlpha: 0.22 }, // faint G–A arc
];

export default function GbaField() {
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

    const POINTER_R = 175; // influence radius (CSS px)
    const LINK_DIST = 115; // max particle-particle link length near pointer

    function buildGlyphs() {
      glyphs.length = 0;
      const size = Math.max(64, Math.min(240, Math.min(width, height) * 0.2));
      glyphSize = size;
      const spacing = size * 0.7;
      const cx = width / 2;
      const cy = height / 2;
      for (let i = 0; i < LETTERS.length; i++) {
        const ax = cx + (i - 1) * spacing;
        glyphs.push({
          char: LETTERS[i],
          ax,
          ay: cy,
          ampX: size * 0.06, // small enough that letters never reorder
          ampY: size * 0.1,
          fx: 0.25 + i * 0.07,
          fy: 0.35 + i * 0.05,
          px: i * 1.7,
          py: i * 2.3 + 0.6,
          x: ax,
          y: cy,
        });
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

      // --- particles + their glow, using additive blending ---
      ctx!.globalCompositeOperation = "lighter";
      for (const p of particles) {
        ctx!.beginPath();
        ctx!.fillStyle = dotColor(p.hue, p.alpha);
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fill();
      }

      // --- interactive links near the pointer ---
      if (pointer.active) {
        const near: Particle[] = [];
        for (const p of particles) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          if (dx * dx + dy * dy < POINTER_R * POINTER_R) near.push(p);
        }
        // pointer -> particle
        for (const p of near) {
          const d = Math.hypot(p.x - pointer.x, p.y - pointer.y);
          const a = (1 - d / POINTER_R) * 0.45;
          ctx!.strokeStyle = `rgba(255, 255, 255, ${a})`;
          ctx!.lineWidth = 0.6;
          ctx!.beginPath();
          ctx!.moveTo(pointer.x, pointer.y);
          ctx!.lineTo(p.x, p.y);
          ctx!.stroke();
        }
        // particle <-> particle (only among the near set — cheap)
        for (let i = 0; i < near.length; i++) {
          for (let j = i + 1; j < near.length; j++) {
            const dx = near[i].x - near[j].x;
            const dy = near[i].y - near[j].y;
            const d2 = dx * dx + dy * dy;
            if (d2 < LINK_DIST * LINK_DIST) {
              const a = (1 - Math.sqrt(d2) / LINK_DIST) * 0.35;
              ctx!.strokeStyle = `rgba(220, 226, 238, ${a})`;
              ctx!.lineWidth = 0.5;
              ctx!.beginPath();
              ctx!.moveTo(near[i].x, near[i].y);
              ctx!.lineTo(near[j].x, near[j].y);
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

      // --- the GBA letters: clean white→silver, soft cool-white halo ---
      ctx!.globalCompositeOperation = "source-over";
      const size = glyphSize;
      ctx!.font = `600 ${size}px -apple-system, "SF Pro Display", system-ui, "Segoe UI", Roboto, sans-serif`;
      ctx!.textAlign = "center";
      ctx!.textBaseline = "middle";
      const grad = ctx!.createLinearGradient(0, height / 2 - size * 0.6, 0, height / 2 + size * 0.6);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.55, "#f2f3f5");
      grad.addColorStop(1, "#c4c9d4");
      for (const g of glyphs) {
        ctx!.shadowBlur = size * 0.18;
        ctx!.shadowColor = "rgba(214, 224, 255, 0.45)";
        ctx!.fillStyle = grad;
        ctx!.fillText(g.char, g.x, g.y);
      }
      ctx!.shadowBlur = 0;
    }

    function step(dt: number) {
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // ramp opacity up so fresh arrivals visibly emerge from outside
        if (p.alpha < p.targetAlpha) {
          p.alpha = Math.min(p.targetAlpha, p.alpha + dt * 0.6);
        }

        // gentle repulsion from the pointer
        if (pointer.active) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const dist = Math.hypot(dx, dy) || 0.0001;
          if (dist < POINTER_R) {
            const force = (1 - dist / POINTER_R) * 1400;
            p.vx += (dx / dist) * force * dt;
            p.vy += (dy / dist) * force * dt;
          }
        }

        // clamp top speed, then ease back toward a calm drift speed
        const speed = Math.hypot(p.vx, p.vy);
        const MAX = 110;
        const BASE = 18;
        if (speed > MAX) {
          p.vx = (p.vx / speed) * MAX;
          p.vy = (p.vy / speed) * MAX;
        } else if (speed > BASE) {
          const next = Math.max(BASE, speed - 40 * dt);
          p.vx = (p.vx / speed) * next;
          p.vy = (p.vy / speed) * next;
        }

        if (isOffscreen(p, width, height)) {
          particles[i] = spawnFromEdge(width, height);
        }
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
  }, []);

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
