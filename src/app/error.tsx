"use client";
import Link from "next/link";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="mx-auto max-w-lg px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-ink-2">{error.message || "The page couldn't be shown. Your ideas are still stored in this browser."}</p>
      <div className="mt-5 flex justify-center gap-2">
        <button type="button" onClick={reset} className="rounded bg-accent-strong px-3 py-2 text-sm font-medium text-accent-fg">Try again</button>
        <Link href="/app/ideas" className="rounded border border-line px-3 py-2 text-sm font-medium">Your ideas</Link>
      </div>
    </main>
  );
}
