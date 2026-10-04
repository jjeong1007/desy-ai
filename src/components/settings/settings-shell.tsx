"use client";
import { ChevronLeft, CreditCard, LifeBuoy, Plug, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { NavItem, NavSection } from "@/components/ui/navigation";
import { cn } from "@/lib/utils";

export const SETTINGS_NAV = [
  { href: "/app/settings/account", label: "Account", icon: <UserRound /> },
  { href: "/app/settings/billing", label: "Plans & billing", icon: <CreditCard /> },
  { href: "/app/settings/integrations", label: "Integrations", icon: <Plug /> },
  { href: "/app/settings/support", label: "Support", icon: <LifeBuoy /> },
  { href: "/app/settings/privacy", label: "Data privacy", icon: <ShieldCheck /> },
];

/** Layout for /app/settings: a settings nav in place of the app sidebar, with tabs on small screens. */
export function SettingsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-[calc(100vh-66px)]">
      <aside className="sticky top-[66px] hidden h-[calc(100vh-66px)] w-sidebar shrink-0 border-r border-line-strong/25 md:block">
        <nav aria-label="Settings" className="flex h-full flex-col gap-2 px-4 py-3">
          <Link href="/app" className="flex h-[33px] items-center gap-2 rounded-sm px-2 text-body font-medium text-fg-secondary transition-colors hover:bg-subtle hover:text-fg [&_svg]:size-4">
            <ChevronLeft aria-hidden /> Back to app
          </Link>
          <NavSection label="Settings">
            {SETTINGS_NAV.map((item) => (
              <NavItem key={item.href} href={item.href} icon={item.icon} active={pathname.startsWith(item.href)}>
                {item.label}
              </NavItem>
            ))}
          </NavSection>
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <nav aria-label="Settings" className="no-print sticky top-[66px] z-30 flex gap-1 overflow-x-auto border-b border-line bg-canvas px-4 py-2 md:hidden">
          {SETTINGS_NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn("flex shrink-0 items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-small font-medium [&_svg]:size-3.5", active ? "bg-brand-subtle text-fg-brand" : "text-fg-secondary hover:bg-subtle")}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8 md:py-10">{children}</div>
      </div>
    </div>
  );
}

export function SettingsHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="flex flex-col gap-1 pb-2">
      <h1 className="m-0 text-page-title font-semibold text-fg">{title}</h1>
      <p className="m-0 text-body text-fg-secondary">{description}</p>
    </header>
  );
}

/** A titled block of settings; consecutive sections are separated by a rule. */
export function SettingsSection({ id, title, description, actions, children }: { id: string; title: string; description?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24 border-t border-line py-8 first-of-type:border-t-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex max-w-[62ch] flex-col gap-1">
          <h2 id={`${id}-h`} className="m-0 text-title font-semibold text-fg">
            {title}
          </h2>
          {description ? <p className="m-0 text-small text-fg-secondary">{description}</p> : null}
        </div>
        {actions}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** One setting: label and help on the left, its control on the right. */
export function SettingRow({ title, description, children }: { title: ReactNode; description?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
      <div className="flex min-w-0 max-w-[52ch] flex-col gap-0.5">
        <span className="text-body font-medium text-fg">{title}</span>
        {description ? <span className="text-small text-fg-secondary">{description}</span> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
