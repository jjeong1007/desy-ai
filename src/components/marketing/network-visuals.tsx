"use client";

import type { CSSProperties } from "react";
import { usePrefersReducedMotion } from "@/components/marketing/layout";
import { LogoMark } from "@/components/logo";
import { Tag } from "@/components/ui/tag";
import { cn } from "@/lib/utils";
import { AI_TOOLS } from "@/config/integrations";

type Brand = { name: string; src: string; mono?: boolean };
type Point = { x: number; y: number };
type Placed = Brand & Point;

const SOURCES: Brand[] = [
  { name: "G2", src: "/marketing/sources/logo-1.png" },
  { name: "GitHub", src: "/marketing/sources/logo-4.png", mono: true },
  { name: "LinkedIn", src: "/marketing/sources/linkedin.svg" },
  { name: "Reddit", src: "/marketing/sources/reddit.svg" },
  { name: "Hacker News", src: "/marketing/sources/hackernews.svg" },
  { name: "Product Hunt", src: "/marketing/sources/producthunt.svg" },
  { name: "App Store", src: "/marketing/sources/logo-2.png" },
  { name: "Google Play", src: "/marketing/sources/logo-3.png" },
];

const TOOLS: Brand[] = AI_TOOLS.map((t) => ({ name: t.name, src: t.logo, mono: t.mono }));

interface Graph {
  w: number;
  h: number;
  hub: Point;
  hubSize: number;
  tile: number;
  nodes: Placed[];
  /** "x" bends edges horizontally, "y" vertically. */
  axis: "x" | "y";
  /** Packets travel toward the hub ("in") or away from it ("out"). */
  flow: "in" | "out";
  /** Optional shared trunk point between the hub and every edge. */
  junction?: Point;
  labels?: boolean;
}

/** Bezier from a to b that leaves and arrives along the given axis. */
function curve(a: Point, b: Point, axis: "x" | "y") {
  if (axis === "x") {
    const mx = (a.x + b.x) / 2;
    return `C ${mx} ${a.y} ${mx} ${b.y} ${b.x} ${b.y}`;
  }
  const my = (a.y + b.y) / 2;
  return `C ${a.x} ${my} ${b.x} ${my} ${b.x} ${b.y}`;
}

function edgePath(g: Graph, node: Point) {
  if (g.junction) {
    const j = g.junction;
    return g.flow === "out" ? `M ${g.hub.x} ${g.hub.y} L ${j.x} ${j.y} ${curve(j, node, g.axis)}` : `M ${node.x} ${node.y} ${curve(node, j, g.axis)} L ${g.hub.x} ${g.hub.y}`;
  }
  return g.flow === "out" ? `M ${g.hub.x} ${g.hub.y} ${curve(g.hub, node, g.axis)}` : `M ${node.x} ${node.y} ${curve(node, g.hub, g.axis)}`;
}

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

/** Logo tiles wired to a central Desy hub, with packets running along each edge. */
function NodeGraph({ g, className, junctionLabel }: { g: Graph; className?: string; junctionLabel?: string }) {
  const reduced = usePrefersReducedMotion();
  const place = (p: Point, size: number): CSSProperties => ({ left: pct(p.x, g.w), top: pct(p.y, g.h), width: pct(size, g.w) });

  return (
    <div className={cn("relative w-full", className)} style={{ aspectRatio: `${g.w} / ${g.h}` }}>
      <svg aria-hidden viewBox={`0 0 ${g.w} ${g.h}`} className="absolute inset-0 size-full overflow-visible">
        {g.nodes.map((n, i) => {
          const d = edgePath(g, n);
          return (
            <g key={n.name}>
              <path d={d} fill="none" className="stroke-canvas" strokeOpacity={0.75} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
              {!reduced && (
                <circle r={g.w > 800 ? 5 : 4} className="fill-brand stroke-canvas" strokeWidth={1.5} vectorEffect="non-scaling-stroke">
                  <animateMotion dur="2.8s" begin={`-${(i * 2.8) / g.nodes.length}s`} repeatCount="indefinite" path={d} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.2 1" />
                </circle>
              )}
            </g>
          );
        })}
      </svg>

      {g.nodes.map((n) => (
        <div key={n.name} className="absolute aspect-square -translate-x-1/2 -translate-y-1/2" style={place(n, g.tile)}>
          <div title={n.name} className="glass-card flex size-full items-center justify-center rounded-lg">
            <img src={n.src} alt={n.name} className={cn("size-1/2 max-w-none object-contain", n.mono && "dark:invert")} />
          </div>
          {g.labels && (
            <Tag className="absolute top-full left-1/2 mt-2 -translate-x-1/2 whitespace-nowrap bg-canvas" aria-hidden>
              {n.name}
            </Tag>
          )}
        </div>
      ))}

      {g.junction && junctionLabel && (
        <span className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: pct(g.junction.x, g.w), top: pct(g.junction.y, g.h) }}>
          <Tag variant="brand" className="whitespace-nowrap shadow-card">
            {junctionLabel}
          </Tag>
        </span>
      )}

      <div className="absolute aspect-square -translate-x-1/2 -translate-y-1/2" style={place(g.hub, g.hubSize)}>
        <div className="glass-card flex size-full flex-col items-center justify-center gap-2 rounded-lg">
          <LogoMark size={22} className="text-brand" />
          <span className="text-title font-semibold text-fg">Desy</span>
        </div>
      </div>
    </div>
  );
}

function Stage({ label, src, children }: { label: string; src: string; children: React.ReactNode }) {
  return (
    <figure aria-label={label} className="relative m-0 flex w-full items-center justify-center px-4 py-8 sm:px-8 md:py-12">
      <img src={src} alt="" className="pointer-events-none absolute inset-0 size-full max-w-none rounded-xl object-cover" />
      {children}
    </figure>
  );
}

/** Alternates out, in, out, in… so neighbours never sit side by side; the pattern is symmetric about the centre point. */
function zigzag(i: number) {
  return i % 2 === 0 ? -1 : 1;
}

/** Sources zigzagging along a symmetric arc that bends toward the hub. */
function sourcesWide(): Graph {
  const w = 1000;
  const h = 600;
  const hub = { x: 740, y: h / 2 };
  const radius = 470;
  const pitch = 72;
  const offset = 52;
  const nodes = SOURCES.map((s, i) => {
    const y = h / 2 + (i - (SOURCES.length - 1) / 2) * pitch;
    const x = hub.x - Math.sqrt(radius ** 2 - (y - hub.y) ** 2) + zigzag(i) * offset;
    return { ...s, x, y };
  });
  return { w, h, hub, hubSize: 132, tile: 66, nodes, axis: "x", flow: "in" };
}

/** Sources fanned on a half circle above the hub, alternating near and far rings, for narrow screens. */
function sourcesNarrow(): Graph {
  const w = 360;
  const h = 360;
  const hub = { x: w / 2, y: 305 };
  const inset = Math.PI * 0.08;
  const nodes = SOURCES.map((s, i) => {
    const angle = Math.PI - inset - ((Math.PI - 2 * inset) * i) / (SOURCES.length - 1);
    // Mirror the fan left to right: rings alternate from each end inward, so the middle pair lands on the outer ring.
    const fromEdge = Math.min(i, SOURCES.length - 1 - i);
    const radius = fromEdge % 2 === 1 ? 255 : 180;
    return { ...s, x: hub.x + radius * Math.cos(angle) * 0.62, y: hub.y - radius * Math.sin(angle) };
  });
  return { w, h, hub, hubSize: 84, tile: 52, nodes, axis: "y", flow: "in" };
}

function toolsGraph(w: number, pitch: number, tile: number, hubSize: number): Graph {
  const h = w > 600 ? 400 : 330;
  const hub = { x: w / 2, y: hubSize / 2 + 8 };
  const junction = { x: w / 2, y: hub.y + hubSize / 2 + (w > 600 ? 72 : 48) };
  const y = h - tile / 2 - 44;
  const nodes = TOOLS.map((t, i) => ({ ...t, x: w / 2 + (i - (TOOLS.length - 1) / 2) * pitch, y }));
  return { w, h, hub, hubSize, tile, nodes, axis: "y", flow: "out", junction, labels: true };
}

/** Public sources feeding Desy: the "evidence isn't AI slop" visual. */
export function SourcesNetworkVisual() {
  return (
    <Stage label="Desy pulls evidence from G2, GitHub, LinkedIn, Reddit, Hacker News, Product Hunt, the App Store, and Google Play" src="/marketing/finding-dunes.png">
      <NodeGraph g={sourcesWide()} className="hidden max-w-[1000px] md:block" />
      <NodeGraph g={sourcesNarrow()} className="max-w-[360px] md:hidden" />
    </Stage>
  );
}

/** Desy serving context to coding and chat agents over MCP. */
export function McpNetworkVisual() {
  return (
    <Stage label="Desy connects over MCP to Cursor, ChatGPT, Claude, Gemini, and Copilot" src="/marketing/feature-dunes.png">
      <NodeGraph g={toolsGraph(1000, 190, 72, 120)} junctionLabel="MCP server" className="hidden max-w-[1000px] md:block" />
      <NodeGraph g={toolsGraph(360, 70, 52, 84)} junctionLabel="MCP server" className="max-w-[360px] md:hidden" />
    </Stage>
  );
}
