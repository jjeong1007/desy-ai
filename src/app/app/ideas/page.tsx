import type { Metadata } from "next";
import { Dashboard } from "@/components/app/dashboard";

export const metadata: Metadata = { title: "Ideas" };

export default function IdeasPage() {
  return <Dashboard />;
}
