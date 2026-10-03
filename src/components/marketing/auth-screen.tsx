"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { getSettings, signIn } from "@/services/account";
import { useDesy } from "@/store/desy";

export function AuthScreen({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/app";
  const hydrated = useDesy((s) => s.hydrated);
  const session = useDesy((s) => s.session);
  const setSession = useDesy((s) => s.setSession);
  const setSettings = useDesy((s) => s.setSettings);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const signUp = mode === "sign-up";

  useEffect(() => {
    if (hydrated && session) router.replace(next.startsWith("/") ? next : "/app");
  }, [hydrated, session, router, next]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (signUp && name.trim().length < 2) nextErrors.name = "Add your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextErrors.email = "Enter a valid email.";
    if (!password) nextErrors.password = "Enter any password. This demo doesn't check it.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setBusy(true);
    try {
      const s = await signIn(email.trim(), signUp ? name.trim() : undefined);
      setSession(s);
      setSettings(await getSettings());
      toast.success(signUp ? "Account created" : "Signed in");
      router.push(next.startsWith("/") ? next : "/app");
    } catch {
      toast.error("Couldn't sign you in. Try again.");
      setBusy(false);
    }
  };

  return (
    <main id="main" className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Logo />
      <div className="mt-8 w-full max-w-sm">
        <h1 className="text-[32px] font-semibold leading-none">{signUp ? "Create your account" : "Sign in"}</h1>
        <p className="mt-1 text-sm text-ink-2">{signUp ? "Any details work. Nothing is sent to a server." : "Demo sign-in. Any email and password will do."}</p>
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
            {errors.email ? <p id="email-err" className="mt-1 text-xs text-weak">{errors.email}</p> : <p id="email-hint" className="mt-1 text-xs text-muted">Used only as your display name on this device.</p>}
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete={signUp ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!errors.password} aria-describedby={errors.password ? "pw-err" : "pw-hint"} className="mt-1.5" />
            {errors.password ? <p id="pw-err" className="mt-1 text-xs text-weak">{errors.password}</p> : <p id="pw-hint" className="mt-1 text-xs text-muted">Not stored. Any value is accepted.</p>}
          </div>
          <Button type="submit" variant="primary" className="w-full" disabled={busy}>
            {busy ? "Signing in…" : signUp ? "Create account" : "Sign in"}
          </Button>
        </form>
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
    </main>
  );
}
