"use client";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { useDesy } from "@/store/desy";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#scoring", label: "Scoring" },
  { href: "/#sample", label: "Sample report" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

export function SiteHeader() {
  const session = useDesy((s) => s.session);
  const hydrated = useDesy((s) => s.hydrated);
  const [open, setOpen] = useState(false);
  const signedIn = hydrated && !!session;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas">
      <div className="mx-auto flex h-[66px] w-full max-w-[1120px] items-center justify-between gap-3 px-4 md:px-6">
        <Logo />
        <nav aria-label="Marketing" className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="rounded px-2.5 py-1.5 text-sm text-ink-2 hover:bg-surface hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 sm:flex">
          {signedIn ? (
            <Button asChild variant="primary" size="sm">
              <Link href="/app">Open app</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild variant="primary" size="sm">
                <Link href="/sign-up">Validate an idea</Link>
              </Button>
            </>
          )}
        </div>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((v) => !v)}>
          {open ? <X /> : <Menu />}
        </Button>
      </div>
      {open ? (
        <nav id="mobile-nav" aria-label="Marketing" className="border-t border-line px-4 py-3 lg:hidden">
          <ul className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(false)} className="block rounded px-2 py-2 text-sm text-ink-2 hover:bg-surface hover:text-ink">
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="mt-2 flex flex-col gap-2 sm:hidden">
              {signedIn ? (
                <Button asChild variant="primary">
                  <Link href="/app">Open app</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="secondary">
                    <Link href="/sign-in">Sign in</Link>
                  </Button>
                  <Button asChild variant="primary">
                    <Link href="/sign-up">Validate an idea</Link>
                  </Button>
                </>
              )}
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-4 py-10 md:flex-row md:items-start md:justify-between md:px-6">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-3 text-sm leading-relaxed text-ink-2">Know whether your idea is worth building before you build it. This demo stores everything in your browser and simulates research agents.</p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm">
          <Link href="/#how" className="text-ink-2 hover:text-ink">How it works</Link>
          <Link href="/#scoring" className="text-ink-2 hover:text-ink">How scoring works</Link>
          <Link href="/#sources" className="text-ink-2 hover:text-ink">Sources</Link>
          <Link href="/pricing" className="text-ink-2 hover:text-ink">Pricing</Link>
          <Link href="/#faq" className="text-ink-2 hover:text-ink">FAQ</Link>
          <Link href="/sign-in" className="text-ink-2 hover:text-ink">Sign in</Link>
          <Link href="/sign-up" className="text-ink-2 hover:text-ink">Create account</Link>
          <Link href="/app" className="text-ink-2 hover:text-ink">App</Link>
        </nav>
      </div>
    </footer>
  );
}

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </div>
  );
}
