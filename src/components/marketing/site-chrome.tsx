"use client";
import { ClipboardList, Gauge, Menu, MessagesSquare, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { Container } from "@/components/marketing/layout";
import { NavMenu, type NavMenuItem } from "@/components/marketing/parts";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { useDesy } from "@/store/desy";

const product: NavMenuItem[] = [
  { icon: <Gauge />, title: "Idea de-risking", description: "A score, the evidence, and a pursuit band", href: "/#scoring" },
  { icon: <MessagesSquare />, title: "Data sources", description: "The findings behind every criterion", href: "/#sources" },
  { icon: <ClipboardList />, title: "Research planner", description: "A discovery script for the weakest evidence", href: "/#planner" },
];

const linkClass = "flex h-[33px] items-center rounded-sm text-body font-medium text-fg no-underline transition-colors hover:text-fg-secondary";

export function SiteHeader() {
  const session = useDesy((s) => s.session);
  const hydrated = useDesy((s) => s.hydrated);
  const [open, setOpen] = useState(false);
  const signedIn = hydrated && !!session;

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas">
      <Container className="flex items-center justify-between py-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
            <NavMenu
              label="Product"
              items={product}
              footer={
                <Link href="/#faq" className="text-small font-medium text-fg-secondary no-underline hover:text-fg">
                  Read the FAQ →
                </Link>
              }
            />
            <Link href="/#how" className={linkClass}>
              How it works
            </Link>
            <Link href="/pricing" className={linkClass}>
              Pricing
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {!signedIn && (
            <Button asChild variant="quiet" size="lg" className="hidden sm:inline-flex">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          )}
          <Button asChild size="lg" variant="primary">
            <Link href={signedIn ? "/app" : "/sign-up"}>{signedIn ? "Open app" : "Validate an idea"}</Link>
          </Button>
          <ThemeToggle />
          <IconButton label={open ? "Close menu" : "Open menu"} size="lg" className="md:hidden" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            {open ? <X /> : <Menu />}
          </IconButton>
        </div>
      </Container>
      {open && (
        <nav aria-label="Mobile" className="border-t border-line md:hidden">
          <Container className="flex flex-col gap-1 py-4">
            {product.map((it) => (
              <Link key={it.title} href={it.href ?? "/"} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-sm p-2 text-body font-medium text-fg no-underline hover:bg-subtle [&_svg]:size-4 [&_svg]:text-fg-secondary">
                {it.icon}
                {it.title}
              </Link>
            ))}
            <Link href="/pricing" onClick={() => setOpen(false)} className="rounded-sm p-2 text-body font-medium text-fg no-underline hover:bg-subtle">
              Pricing
            </Link>
            {!signedIn && (
              <Link href="/sign-in" onClick={() => setOpen(false)} className="rounded-sm p-2 text-body font-medium text-fg no-underline hover:bg-subtle sm:hidden">
                Sign in
              </Link>
            )}
          </Container>
        </nav>
      )}
    </header>
  );
}

const footerLinks: Record<string, { label: string; href: string }[]> = {
  Product: [
    { label: "How it works", href: "/#how" },
    { label: "Scoring", href: "/#scoring" },
    { label: "Sources", href: "/#sources" },
    { label: "Pricing", href: "/pricing" },
  ],
  Account: [
    { label: "Sign in", href: "/sign-in" },
    { label: "Create account", href: "/sign-up" },
    { label: "Open app", href: "/app" },
  ],
  Company: [{ label: "FAQ", href: "/#faq" }],
};

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-muted">
      <Container className="flex flex-col gap-12 py-12">
        <div className="grid gap-8 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-3">
            <Logo />
            <p className="m-0 max-w-[320px] text-body text-fg-secondary">Know whether your idea is worth building before you build it.</p>
          </div>
          {Object.entries(footerLinks).map(([group, links]) => (
            <nav key={group} aria-label={group} className="flex flex-col gap-2">
              <span className="text-small font-medium text-fg-tertiary">{group}</span>
              {links.map((l) => (
                <Link key={l.href} href={l.href} className="text-body text-fg-secondary no-underline transition-colors hover:text-fg">
                  {l.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>
        <div className="flex flex-col justify-between gap-2 border-t border-line pt-6 text-small text-fg-tertiary sm:flex-row">
          <span>© {new Date().getFullYear()} Desy. All rights reserved.</span>
          <span>This demo stores everything in your browser.</span>
        </div>
      </Container>
    </footer>
  );
}

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-fg">
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
