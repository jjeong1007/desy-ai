"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { FileText, House, LogOut, Menu, MessageCircle, Monitor, Moon, Plus, Settings, Sun } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/field";
import { NavItem, NavSection, Sidebar, TeamSwitcher, TopNav } from "@/components/ui/navigation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, SheetContent } from "@/components/ui/overlay";
import { saveSettings, signOut } from "@/services/account";
import { useDesy } from "@/store/desy";
import { IdeaSwitcher } from "./idea-switcher";

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const params = useParams<{ id?: string }>();
  const ideas = useDesy((s) => s.ideas);
  return (
    <Sidebar
      className="w-full border-r-0"
      header={<TeamSwitcher name="Desy Team" />}
      footer={
        <>
          <button
            type="button"
            onClick={() => toast.message("Thanks. This demo keeps feedback on your machine and doesn't send it.")}
            className="flex h-[33px] items-center gap-2 rounded-sm px-2 text-left text-body font-medium text-fg-secondary hover:bg-subtle hover:text-fg [&_svg]:size-4"
          >
            <MessageCircle /> Give feedback
          </button>
          <NavItem href="/app/settings" icon={<Settings />} active={pathname === "/app/settings"} onClick={onNavigate}>
            Settings
          </NavItem>
        </>
      }
    >
      <NavItem href="/app" icon={<House />} active={pathname === "/app"} onClick={onNavigate}>
        Home
      </NavItem>
      <NavSection label="Ideas">
        {ideas.length === 0 ? <p className="px-2 py-1 text-small text-fg-tertiary">No ideas yet</p> : null}
        {ideas.map((i) => {
          const href = i.status === "draft" ? `/app/ideas/new?draft=${i.id}` : i.status === "running" ? `/app/ideas/${i.id}/run` : `/app/ideas/${i.id}`;
          return (
            <NavItem key={i.id} href={href} icon={<FileText />} active={params?.id === i.id} onClick={onNavigate}>
              <span className="truncate">{i.intake.name || "Untitled draft"}</span>
            </NavItem>
          );
        })}
      </NavSection>
    </Sidebar>
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
        <aside className="no-print sticky top-[66px] hidden h-[calc(100vh-66px)] w-sidebar shrink-0 border-r border-line md:block">
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
