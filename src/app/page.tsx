import type { Metadata } from "next";
import { LandingPage } from "@/components/marketing/landing";

export const metadata: Metadata = {
  title: { absolute: "Desy: know if your idea is worth building" },
  description: "Desy scores a small SaaS idea against evidence and a pursuit band before you build it. For solo founders, whether they code or not.",
};

export default function HomePage() {
  return <LandingPage />;
}
