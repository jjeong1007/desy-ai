import type { ReactNode, AnchorHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";
import { SearchInput } from "./inputs";

/** NavItem — Figma component set "Frame 16" (142:2392): State=Active | Inactive. */
export interface NavItemProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  icon?: ReactNode;
  active?: boolean;
}

export function NavItem({ icon, active, className, children, href, onClick, ...props }: NavItemProps) {
  const cls = cn(
    "flex h-[33px] items-center gap-2 rounded-sm px-2 text-body font-medium no-underline transition-colors [&_svg]:size-4 [&_svg]:shrink-0",
    active ? "bg-brand-subtle text-fg-brand" : "text-fg-secondary hover:bg-subtle hover:text-fg",
    className,
  );
  const inner = (
    <>
      {icon}
      {children}
    </>
  );
  if (typeof href === "string" && href.startsWith("/")) {
    return (
      <Link href={href} aria-current={active ? "page" : undefined} className={cls} onClick={onClick}>
        {inner}
      </Link>
    );
  }
  return (
    <a href={href} aria-current={active ? "page" : undefined} className={cls} onClick={onClick} {...props}>
      {inner}
    </a>
  );
}

export function NavSection({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      {label && <div className="px-2 pb-0.5 pt-2 text-caption font-medium text-fg-tertiary">{label}</div>}
      {children}
    </div>
  );
}

/** TeamSwitcher — Figma 139:691. */
export function TeamSwitcher({ name, onClick }: { name: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex h-6 w-full items-center gap-2 rounded-sm px-2 text-small font-medium text-fg-secondary hover:bg-subtle">
      <Avatar />
      <span className="flex-1 truncate text-left">{name}</span>
      <ChevronDown className="size-4" aria-hidden />
    </button>
  );
}

/** Sidebar — Figma component set "Navbar" (121:248). */
export function Sidebar({ header, footer, children, className }: { header?: ReactNode; footer?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <nav aria-label="Main" className={cn("flex h-full w-sidebar shrink-0 flex-col border-r border-line bg-canvas px-4 py-3", className)}>
      {header && <div className="mb-2 border-b border-line pb-2">{header}</div>}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">{children}</div>
      {footer && <div className="flex flex-col gap-0.5 pt-4">{footer}</div>}
    </nav>
  );
}

/** TopNav — Figma component "Top Nav" (130:588). `search` and `actions` slot product controls into the same bar. */
export function TopNav({ credits, avatar, search, actions, className }: { credits?: number; avatar?: ReactNode; search?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <header className={cn("flex h-topnav shrink-0 items-center justify-between gap-6 border-b border-line bg-canvas px-6", className)}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Logo href="/app" />
        {search ?? <SearchInput className="w-full max-w-[521px]" />}
      </div>
      <div className="flex items-center gap-4">
        {actions}
        {credits !== undefined && (
          <span className="text-body font-medium">
            <span className="text-fg-brand">{credits}</span> credits
          </span>
        )}
        {avatar ?? <Avatar size="lg" />}
      </div>
    </header>
  );
}
