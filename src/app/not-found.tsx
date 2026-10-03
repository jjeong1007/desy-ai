import Link from "next/link";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <Logo />
      <h1 className="text-2xl font-semibold">This page doesn&apos;t exist</h1>
      <p className="max-w-sm text-sm text-ink-2">The link may be old, or the idea was deleted.</p>
      <div className="flex gap-2">
        <Link href="/app" className="rounded bg-accent-strong px-3 py-2 text-sm font-medium text-accent-fg">Go to dashboard</Link>
        <Link href="/" className="rounded border border-line px-3 py-2 text-sm font-medium">Home</Link>
      </div>
    </main>
  );
}
