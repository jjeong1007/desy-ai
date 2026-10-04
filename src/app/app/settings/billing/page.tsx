import type { Metadata } from "next";
import { BillingSettings } from "@/components/settings/billing";

export const metadata: Metadata = { title: "Plans & billing" };

export default function Page() {
  return <BillingSettings />;
}
