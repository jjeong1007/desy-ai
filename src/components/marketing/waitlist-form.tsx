"use client";
import { Check } from "lucide-react";
import { useId, useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/inputs";
import { joinWaitlist } from "@/server/actions/waitlist";
import { cn } from "@/lib/utils";

/** Email capture for the landing page waitlist. */
export function WaitlistForm({ source, className }: { source: "hero" | "footer"; className?: string }) {
  const inputId = useId();
  const messageId = useId();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await joinWaitlist(email, source).catch(() => ({ ok: false as const, error: "Something went wrong. Try again in a moment." }));
      if (res.ok) setJoined(true);
      else setError(res.error);
    });
  }

  if (joined) {
    return (
      <p role="status" className={cn("m-0 flex h-[41px] items-center gap-2 text-body font-medium text-fg", className)}>
        <Check className="size-4 text-fg-brand" aria-hidden /> You’re on the list. We’ll email you when your spot opens.
      </p>
    );
  }

  return (
    <form onSubmit={submit} noValidate className={cn("flex w-full max-w-[480px] flex-col gap-2", className)}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={inputId} className="sr-only">
          Email address
        </label>
        <TextInput
          id={inputId}
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          invalid={!!error}
          aria-describedby={error ? messageId : undefined}
          className="h-[41px] min-w-0 flex-1"
        />
        <Button type="submit" size="lg" variant="primary" aria-busy={pending}>
          {pending ? "Joining…" : "Join the waitlist"}
        </Button>
      </div>
      {error && (
        <p id={messageId} role="alert" className="m-0 text-left text-small text-git-deleted">
          {error}
        </p>
      )}
    </form>
  );
}
