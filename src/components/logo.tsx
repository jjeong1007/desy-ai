import Link from "next/link";
import { cn } from "@/lib/utils";

/** Three rotated squares, taken from the Figma wordmark geometry. */
export function LogoMark({ className, size = 12 }: { className?: string; size?: number }) {
  const centers: [number, number][] = [
    [3.79, 3.79],
    [3.79, 13.06],
    [8.6, 8.42],
  ];
  const d = 5.357;
  return (
    <svg width={size} height={size * 1.36} viewBox="0 0 12.4 16.85" aria-hidden className={cn("shrink-0 text-accent", className)}>
      {centers.map(([cx, cy], i) => (
        <rect key={i} x={cx - d / 2} y={cy - d / 2} width={d} height={d} rx={0.6} transform={`rotate(45 ${cx} ${cy})`} fill="currentColor" />
      ))}
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-1 rounded text-[19.368px] font-medium text-[#0d0d0d] dark:text-ink", className)} aria-label="Desy home">
      <LogoMark size={11} />
      <span>Desy</span>
    </Link>
  );
}
