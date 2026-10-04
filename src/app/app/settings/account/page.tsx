import type { Metadata } from "next";
import { AccountSettings } from "@/components/settings/account";

export const metadata: Metadata = { title: "Account" };

export default function Page() {
  return <AccountSettings />;
}
