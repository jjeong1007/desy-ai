"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronDown, House, LogOut, Menu, MessageCircle, Monitor, Moon, Plus, Settings, Sun } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Logo, LogoMark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/field";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, SheetContent } from "@/components/ui/overlay";
import { cn } from "@/lib/utils";
import { saveSettings, signOut } from "@/services/account";
import { useDesy } from "@/store/desy";
import { IdeaSwitcher } from "./idea-switcher";

function NavLink({ href, icon, children, active, onNavigate, tone = "muted" }: { href: string; icon: React.ReactNode; children: React.ReactNode; active: boolean; onNavigate?: () => void; tone?: "muted" | "ink" }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn("flex items-center gap-2 rounded p-2 text-sm font-medium [&_svg]:size-4", active ? "bg-accent-tint text-accent" : tone === "ink" ? "text-ink hover:bg-surface" : "text-ink-2 hover:bg-surface hover:text-ink")}
    >
      {icon}
      {children}
    </Link>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const params = useParams<{ id?: string }>();
  const ideas = useDesy((s) => s.ideas);
  return (
    <div className="flex h-full flex-col justify-between px-4 pb-6 pt-3">
      <div className="flex min-h-0 flex-col gap-3">
        <div className="flex items-center gap-2 px-2 py-1">
          <span className="size-4 shrink-0 rounded-full bg-[rgb(var(--well))]" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink-2">Desy Team</span>
          <ChevronDown className="size-4 shrink-0 text-ink-2" aria-hidden />
        </div>
        <div className="h-px bg-line" />
        <nav aria-label="Main" className="flex flex-col gap-1">
          <NavLink href="/app" icon={<House />} active={pathname === "/app"} onNavigate={onNavigate}>
            Home
          </NavLink>
        </nav>
        <div className="mt-1 flex min-h-0 flex-col gap-1">
          <p id="ideas-heading" className="px-2 pt-2 text-xs font-semibold text-muted">
            Ideas
          </p>
          <ul aria-labelledby="ideas-heading" className="-mr-2 flex min-h-0 flex-col gap-1 overflow-y-auto pr-2 scrollbar-thin">
            {ideas.length === 0 ? <li className="px-2 py-1 text-xs font-medium text-muted">No ideas yet</li> : null}
            {ideas.map((i) => {
              const href = i.status === "draft" ? `/app/ideas/new?draft=${i.id}` : i.status === "running" ? `/app/ideas/${i.id}/run` : `/app/ideas/${i.id}`;
              const active = params?.id === i.id;
              return (
                <li key={i.id}>
                  <Link href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-2 rounded p-2 text-sm font-medium", active ? "bg-accent-tint text-accent" : "text-ink-2 hover:bg-surface hover:text-ink")}>
                    <span className="min-w-0 flex-1 truncate">{i.intake.name || "Untitled draft"}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <nav aria-label="Account" className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => toast.message("Thanks. This demo keeps feedback on your machine and doesn't send it.")}
          className="flex items-center gap-2 rounded p-2 text-left text-sm font-medium text-ink hover:bg-surface [&_svg]:size-4"
        >
          <MessageCircle /> Give feedback
        </button>
        <NavLink href="/app/settings" icon={<Settings />} active={pathname === "/app/settings"} onNavigate={onNavigate} tone="ink">
          Settings
        </NavLink>
      </nav>
    </div>
  );
}

function UserMenu() {
  const session = useDesy((s) => s.session);
  const settings = useDesy((s) => s.settings);
  const setSettings = useDesy((s) => s.setSettings);
  const setSession = useDesy((s) => s.setSession);
  const router = useRouter();
  const setTheme = async (theme: "light" | "dark" | "system") => setSettings(await saveSettings({ theme }));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="size-8 rounded-full bg-[rgb(var(--well))] hover:opacity-80" aria-label={`Account menu for ${session?.name ?? "you"}`} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>
          <span className="block font-medium text-ink">{session?.name}</span>
          <span className="block">{session?.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/app/settings")}>
          <Settings /> Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        {(
          [
            ["light", "Light", <Sun key="s" />],
            ["dark", "Dark", <Moon key="m" />],
            ["system", "System", <Monitor key="x" />],
          ] as const
        ).map(([id, label, icon]) => (
          <DropdownMenuItem key={id} onSelect={() => setTheme(id)} aria-checked={settings?.theme === id} role="menuitemradio">
            {icon} {label}
            {settings?.theme === id ? <span className="ml-auto text-xs text-accent-strong">Active</span> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            await signOut();
            setSession(null);
            toast.success("Signed out");
            router.push("/");
          }}
        >
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const hydrated = useDesy((s) => s.hydrated);
  const session = useDesy((s) => s.session);
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ id?: string }>();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (hydrated && !session) router.replace(`/sign-in?next=${encodeURIComponent(pathname)}`);
  }, [hydrated, session, router, pathname]);

  if (!hydrated || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status" aria-live="polite">
        <span className="flex items-center gap-2 text-sm text-muted">
          <LogoMark className="animate-pulse2" /> Loading your workspace…
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="no-print sticky top-0 z-40 flex h-[66px] items-center justify-between gap-3 border-b border-line bg-canvas px-4 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <DialogPrimitive.Root open={navOpen} onOpenChange={setNavOpen}>
            <DialogPrimitive.Trigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation">
                <Menu />
              </Button>
            </DialogPrimitive.Trigger>
            <SheetContent side="left" title="Navigation">
              <SidebarBody onNavigate={() => setNavOpen(false)} />
            </SheetContent>
          </DialogPrimitive.Root>
          <Logo href="/app" />
          <IdeaSwitcher currentId={params?.id} className="ml-1 hidden w-full max-w-[521px] sm:flex" />
        </div>
        <div className="flex items-center gap-2">
          <IdeaSwitcher currentId={params?.id} className="w-9 justify-center px-0 sm:hidden [&>span>span]:hidden" />
          <Button asChild variant="ghost" size="sm" className="text-ink-2">
            <Link href="/app/ideas/new">
              <Plus /> <span className="hidden sm:inline">New idea</span>
            </Link>
          </Button>
          <UserMenu />
        </div>
      </header>
      <div className="flex">
        <aside className="no-print sticky top-[66px] hidden h-[calc(100vh-66px)] w-[262px] shrink-0 border-r border-line md:block" aria-label="Sidebar">
          <SidebarBody />
        </aside>
        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-4 p-6" role="status" aria-label="Loading">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}
