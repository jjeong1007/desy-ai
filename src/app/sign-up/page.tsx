import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthScreen } from "@/components/marketing/auth-screen";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <Suspense fallback={<main id="main" className="p-10 text-sm text-fg-tertiary">Loading…</main>}>
      <AuthScreen mode="sign-up" />
    </Suspense>
  );
}
