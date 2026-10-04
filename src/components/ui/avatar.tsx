import { cn } from "@/lib/utils";

/** Avatar — 16px (lists), 32px (top nav). Falls back to initials, then a gray circle. */
export interface AvatarProps {
  src?: string;
  name?: string;
  size?: "sm" | "lg";
  color?: string;
  className?: string;
}

export function Avatar({ src, name, size = "sm", color, className }: AvatarProps) {
  const initials = name?.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span
      role={name ? "img" : undefined}
      aria-label={name}
      style={color ? { background: color } : undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-placeholder font-medium text-on-brand",
        size === "sm" ? "size-4 text-[8px]" : "size-8 text-small",
        className,
      )}
    >
      {src ? <img src={src} alt="" className="size-full object-cover" /> : size === "lg" ? initials : null}
    </span>
  );
}

export function AvatarGroup({ people, className }: { people: AvatarProps[]; className?: string }) {
  return (
    <span className={cn("inline-flex -space-x-2", className)}>
      {people.map((p, i) => (
        <Avatar key={i} {...p} className={cn("ring-2 ring-canvas", p.className)} />
      ))}
    </span>
  );
}
