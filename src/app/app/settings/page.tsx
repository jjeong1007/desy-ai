import type { Metadata } from "next";
import { SettingsPage } from "@/components/app/settings-form";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsRoute() {
  return <SettingsPage />;
}
