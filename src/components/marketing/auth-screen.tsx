"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/marketing/site-chrome";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { signIn, signInWithGoogle, signUp as createAccount } from "@/services/account";
import { useDesy } from "@/store/desy";

export function AuthScreen({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const params = useSearchParams();
  const rawNext = params.get("next") || "/app";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/app";
  const hydrated = useDesy((s) => s.hydrated);
  const session = useDesy((s) => s.session);
  const hydrate = useDesy((s) => s.hydrate);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);
  const signUp = mode === "sign-up";

  useEffect(() => {
    if (hydrated && session) router.replace(next);
  }, [hydrated, session, router, next]);

  useEffect(() => {
    if (params.get("error") === "callback") toast.error("That sign-in link didn't work. Try again.");
  }, [params]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (signUp && name.trim().length < 2) nextErrors.name = "Add your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextErrors.email = "Enter a valid email.";
    if (signUp ? password.length < 8 : !password) nextErrors.password = signUp ? "Use at least 8 characters." : "Enter your password.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setBusy(true);
    try {
      if (signUp) {
        const result = await createAccount(name.trim(), email.trim(), password, next);
        if (result.status === "confirmEmail") {
          setConfirmSent(true);
          setBusy(false);
          return;
        }
      } else {
        await signIn(email.trim(), password);
      }
      await hydrate();
      toast.success(signUp ? "Account created" : "Signed in");
      router.push(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't sign you in. Try again.");
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    try {
      await signInWithGoogle(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't start Google sign-in.");
      setBusy(false);
    }
  };

  if (confirmSent) {
    return (
      <MarketingShell>
        <div className="flex flex-col items-center justify-center px-6 py-24">
          <div className="w-full max-w-[420px] rounded-lg border border-line bg-canvas p-6 shadow-card" role="status">
            <h1 className="m-0 text-page-title font-medium text-fg">Check your email</h1>
            <p className="mt-2 text-body text-fg-secondary">We sent a confirmation link to {email.trim()}. Open it to finish creating your account.</p>
          </div>
        </div>
      </MarketingShell>
    );
  }

  return (
    <MarketingShell>
      <div className="flex flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-[420px] rounded-lg border border-line bg-canvas p-6 shadow-card">
        <h1 className="m-0 text-page-title font-medium text-fg">{signUp ? "Create your account" : "Sign in"}</h1>
        <p className="mt-2 text-body text-fg-secondary">{signUp ? "Score your first idea in a few minutes." : "Welcome back."}</p>
        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          {signUp ? (
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-err" : undefined} className="mt-1.5" />
              {errors.name ? <p id="name-err" className="mt-1 text-xs text-weak">{errors.name}</p> : null}
            </div>
          ) : null}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-err" : "email-hint"} className="mt-1.5" />
            {errors.email ? <p id="email-err" className="mt-1 text-xs text-weak">{errors.email}</p> : <p id="email-hint" className="mt-1 text-xs text-fg-tertiary">{signUp ? "We\u2019ll send a link to confirm it." : "\u00a0"}</p>}
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete={signUp ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!errors.password} aria-describedby={errors.password ? "pw-err" : "pw-hint"} className="mt-1.5" />
            {errors.password ? <p id="pw-err" className="mt-1 text-xs text-weak">{errors.password}</p> : <p id="pw-hint" className="mt-1 text-xs text-fg-tertiary">{signUp ? "At least 8 characters." : "\u00a0"}</p>}
          </div>
          <Button type="submit" variant="primary" className="w-full" disabled={busy}>
            {busy ? (signUp ? "Creating account…" : "Signing in…") : signUp ? "Create account" : "Sign in"}
          </Button>
        </form>
        <div className="mt-3">
          <Button type="button" className="w-full" disabled={busy} onClick={() => void google()}>
            Continue with Google
          </Button>
        </div>
        <p className="mt-4 text-sm text-ink-2">
          {signUp ? (
            <>
              Already have an account? <Link href="/sign-in" className="font-medium text-accent-strong hover:underline">Sign in</Link>
            </>
          ) : (
            <>
              New here? <Link href="/sign-up" className="font-medium text-accent-strong hover:underline">Create an account</Link>
            </>
          )}
        </p>
      </div>
      </div>
    </MarketingShell>
  );
}
