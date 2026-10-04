import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthScreen } from "@/components/marketing/auth-screen";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <Suspense fallback={<main id="main" className="p-10 text-sm text-fg-tertiary">Loading…</main>}>
      <AuthScreen mode="sign-in" />
    </Suspense>
  );
}
