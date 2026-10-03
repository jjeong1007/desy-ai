import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/app/app-shell";
import { PrintView } from "@/components/app/print-view";

export const metadata: Metadata = { title: "Print" };

export default function PrintPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PrintView />
    </Suspense>
  );
}
