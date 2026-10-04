import type { Metadata } from "next";
import { SupportSettings } from "@/components/settings/support";

export const metadata: Metadata = { title: "Support" };

export default function Page() {
  return <SupportSettings />;
}
