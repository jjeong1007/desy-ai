import type { Metadata } from "next";
import { IntegrationsSettings } from "@/components/settings/integrations";

export const metadata: Metadata = { title: "Integrations" };

export default function Page() {
  return <IntegrationsSettings />;
}
