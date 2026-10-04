import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/site-chrome";
import { PricingBlock } from "@/components/marketing/pricing-block";

export const metadata: Metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <MarketingShell>
      <PricingBlock heading="page" />
    </MarketingShell>
  );
}
