import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/app/app-shell";
import { IntakeForm } from "@/components/app/intake-form";

export const metadata: Metadata = { title: "New idea" };

export default function NewIdeaPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <IntakeForm />
    </Suspense>
  );
}
