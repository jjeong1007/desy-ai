"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { FileText, FlaskConical, House, Lightbulb, LogOut, Menu, MessageCircle, MessagesSquare, Monitor, Moon, PanelLeftClose, PanelLeftOpen, Plus, Settings, Sun } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Logo, LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/field";
import { NavItem, NavSection, Sidebar, TopNav } from "@/components/ui/navigation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, SheetContent } from "@/components/ui/overlay";
import { saveSettings, signOut } from "@/services/account";
import { useDesy } from "@/store/desy";
import { IdeaSwitcher } from "./idea-switcher";

function SidebarBody({ onNavigate, collapsed = false, onToggle }: { onNavigate?: () => void; collapsed?: boolean; onToggle?: () => void }) {
  const pathname = usePathname();
  const params = useParams<{ id?: string }>();
  const ideas = useDesy((s) => s.ideas);
  const label = (text: React.ReactNode) => (
    <span className={cn("overflow-hidden whitespace-nowrap transition-opacity duration-200", collapsed && "opacity-0")}>{text}</span>
  );
  return (
    <Sidebar
      className={cn("!w-full border-r-0 transition-[padding] duration-300 ease-in-out", collapsed && "px-3")}
      header={
        onToggle ? (
          <div className={cn("flex h-8 items-center", collapsed ? "justify-center" : "justify-between")}>
            {/* Collapsed, the rail only fits the toggle, so the logo fades out like the labels. */}
            <span className={cn("overflow-hidden transition-[opacity,width] duration-200", collapsed ? "w-0 opacity-0" : "pl-2 opacity-100")} aria-hidden={collapsed} inert={collapsed}>
              <Logo href="/app" />
            </span>
            <button
              type="button"
              onClick={onToggle}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              className="flex size-8 shrink-0 items-center justify-center rounded-sm text-fg-secondary transition-colors hover:bg-subtle hover:text-fg [&_svg]:size-4"
            >
              {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            </button>
          </div>
        ) : undefined
      }
      footer={
        <>
          <NavItem href="/app/settings/support#feedback" icon={<MessageCircle />} onClick={onNavigate}>
            {label("Give feedback")}
          </NavItem>
          <NavItem href="/app/settings/account" icon={<Settings />} active={pathname.startsWith("/app/settings")} onClick={onNavigate}>
            {label("Settings")}
          </NavItem>
        </>
      }
    >
      <NavSection>
        <NavItem href="/app" icon={<House />} active={pathname === "/app"} onClick={onNavigate}>
          {label("Home")}
        </NavItem>
        <NavItem href="/app/chat" icon={<MessagesSquare />} active={pathname.startsWith("/app/chat")} onClick={onNavigate}>
          {label("Chat")}
        </NavItem>
        <NavItem href="/app/ideas" icon={<Lightbulb />} active={pathname === "/app/ideas"} onClick={onNavigate}>
          {label("Ideas")}
        </NavItem>
        <NavItem href="/app/planner" icon={<FlaskConical />} active={pathname.startsWith("/app/planner")} onClick={onNavigate}>
          {label("Research Planner")}
        </NavItem>
      </NavSection>
      <div className={cn("flex flex-col gap-2 transition-opacity duration-200", collapsed && "pointer-events-none opacity-0")} aria-hidden={collapsed} inert={collapsed}>
      <NavSection label="Recent ideas">
        {ideas.length === 0 ? <p className="px-2 py-1 text-small text-fg-tertiary">No ideas yet</p> : null}
        {ideas.slice(0, 6).map((i) => {
          const href = i.status === "draft" ? `/app/ideas/new?draft=${i.id}` : i.status === "running" ? `/app/ideas/${i.id}/run` : `/app/ideas/${i.id}`;
          return (
            <NavItem key={i.id} href={href} icon={<FileText />} active={pathname.startsWith("/app/ideas/") && params?.id === i.id} onClick={onNavigate}>
              <span className="truncate">{i.intake.name || "Untitled draft"}</span>
            </NavItem>
          );
        })}
      </NavSection>
      </div>
    </Sidebar>
  );
}

function UserMenu() {
  const session = useDesy((s) => s.session);
  const settings = useDesy((s) => s.settings);
  const setSettings = useDesy((s) => s.setSettings);
  const reset = useDesy((s) => s.reset);
  const router = useRouter();
  const setTheme = async (theme: "light" | "dark" | "system") => setSettings(await saveSettings({ theme }));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="rounded-full" aria-label={`Account menu for ${session?.name ?? "you"}`}>
          <Avatar size="lg" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>
          <span className="block font-medium text-ink">{session?.name}</span>
          <span className="block">{session?.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/app/settings/account")}>
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
            reset();
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
  const loadError = useDesy((s) => s.loadError);
  const hydrate = useDesy((s) => s.hydrate);
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ id?: string }>();
  const [navOpen, setNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const inSettings = pathname.startsWith("/app/settings");

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("desy-sidebar-collapsed") === "1");
    } catch {}
  }, []);

  const toggleCollapsed = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem("desy-sidebar-collapsed", c ? "0" : "1");
      } catch {}
      return !c;
    });

  useEffect(() => {
    if (hydrated && !session && !loadError) router.replace(`/sign-in?next=${encodeURIComponent(pathname)}`);
  }, [hydrated, session, loadError, router, pathname]);

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center" role="alert">
        <p className="m-0 text-body text-fg">{loadError}</p>
        <Button onClick={() => void hydrate()}>Try again</Button>
      </div>
    );
  }

  if (!hydrated || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status" aria-live="polite">
        <span className="flex items-center gap-2 text-sm text-fg-tertiary">
          <LogoMark className="animate-pulse2" /> Loading your workspace…
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <TopNav
        className="no-print sticky top-0 z-40 px-4 md:px-6"
        // The sidebar carries the logo from md up; keep it here on mobile and in Settings, which has its own nav.
        logoClassName={inSettings ? undefined : "md:hidden"}
        search={
          <>
            <DialogPrimitive.Root open={navOpen} onOpenChange={setNavOpen}>
              <DialogPrimitive.Trigger asChild>
                <Button variant="quiet" size="icon" className="md:hidden" aria-label="Open navigation">
                  <Menu />
                </Button>
              </DialogPrimitive.Trigger>
              <SheetContent side="left" title="Navigation">
                <SidebarBody onNavigate={() => setNavOpen(false)} />
              </SheetContent>
            </DialogPrimitive.Root>
            <IdeaSwitcher currentId={params?.id} className="hidden w-full max-w-[521px] sm:flex" />
          </>
        }
        actions={
          <>
            <IdeaSwitcher currentId={params?.id} className="w-9 justify-center px-0 sm:hidden [&>span]:first:hidden" />
            <ThemeToggle />
            <Button asChild variant="quiet" size="sm">
              <Link href="/app/ideas/new">
                <Plus /> <span className="hidden sm:inline">New idea</span>
              </Link>
            </Button>
          </>
        }
        avatar={<UserMenu />}
      />
      <div className="flex">
        {/* Settings brings its own nav (SettingsShell) in place of the app sidebar. */}
        {inSettings ? null : (
          <aside className={cn("no-print sticky top-[66px] hidden h-[calc(100vh-66px)] shrink-0 overflow-hidden border-r border-line-strong/25 transition-[width] duration-300 ease-in-out md:block", collapsed ? "w-14" : "w-sidebar")}>
            <SidebarBody collapsed={collapsed} onToggle={toggleCollapsed} />
          </aside>
        )}
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
