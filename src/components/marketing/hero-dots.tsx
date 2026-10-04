"use client";
import { useEffect, useRef } from "react";

/** Dot pitch, dot radius and cursor reach, in CSS pixels. */
const GAP = 16;
const DOT = 1;
const REACH = 180;
const PUSH = 30;
const GROW = 1.2;
const TINT = 0.45;
const SPRING = 0.14;

/**
 * Subtle dot grid behind the hero. Dots near the cursor drift away, grow slightly and
 * darken from `line` to `line-strong`, then spring back. Reduced motion keeps a static grid.
 */
export function HeroDots({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !host || !ctx) return;

    const read = () => {
      const css = getComputedStyle(document.documentElement);
      return {
        base: `rgb(${css.getPropertyValue("--line").trim()})`,
        strong: `rgb(${css.getPropertyValue("--line-strong").trim()})`,
      };
    };
    let colors = read();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let cols = 0;
    let ox = new Float32Array(0);
    let oy = new Float32Array(0);
    let heat = new Float32Array(0);
    let mouse: { x: number; y: number } | null = null;
    let raf = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      w = host.clientWidth;
      h = host.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / GAP) + 1;
      const n = cols * (Math.ceil(h / GAP) + 1);
      ox = new Float32Array(n);
      oy = new Float32Array(n);
      heat = new Float32Array(n);
      draw();
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      let moving = false;
      const start = (w - (cols - 1) * GAP) / 2;
      for (let i = 0; i < ox.length; i++) {
        const x = start + (i % cols) * GAP;
        const y = GAP / 2 + Math.floor(i / cols) * GAP;
        let tx = 0;
        let ty = 0;
        let th = 0;
        if (mouse && !reduced) {
          const dx = x - mouse.x;
          const dy = y - mouse.y;
          const d = Math.hypot(dx, dy);
          if (d < REACH) {
            const f = (1 - d / REACH) ** 2;
            th = f;
            if (d > 0.01) {
              tx = (dx / d) * PUSH * f;
              ty = (dy / d) * PUSH * f;
            }
          }
        }
        ox[i] += (tx - ox[i]) * SPRING;
        oy[i] += (ty - oy[i]) * SPRING;
        heat[i] += (th - heat[i]) * SPRING;
        if (Math.abs(tx - ox[i]) > 0.05 || Math.abs(ty - oy[i]) > 0.05 || Math.abs(th - heat[i]) > 0.005) moving = true;

        const r = DOT + GROW * heat[i];
        ctx.globalAlpha = 1;
        ctx.fillStyle = colors.base;
        ctx.beginPath();
        ctx.arc(x + ox[i], y + oy[i], r, 0, Math.PI * 2);
        ctx.fill();
        if (heat[i] > 0.01) {
          ctx.globalAlpha = TINT * heat[i];
          ctx.fillStyle = colors.strong;
          ctx.fill();
        }
      }
      return moving;
    };

    const loop = () => {
      const moving = draw();
      raf = mouse || moving ? requestAnimationFrame(loop) : 0;
    };
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      wake();
    };
    const onLeave = () => {
      mouse = null;
      wake();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(host);
    const mo = new MutationObserver(() => {
      colors = read();
      draw();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    if (!reduced) {
      host.addEventListener("pointermove", onMove);
      host.addEventListener("pointerleave", onLeave);
    }
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className={className} />;
}
