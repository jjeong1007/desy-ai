import type { Metadata } from "next";
import { PrivacySettings } from "@/components/settings/privacy";

export const metadata: Metadata = { title: "Data privacy" };

export default function Page() {
  return <PrivacySettings />;
}
