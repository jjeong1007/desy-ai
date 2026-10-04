import { redirect } from "next/navigation";

/** Data privacy now lives on the Account page. Old links and bookmarks land there. */
export default function Page() {
  redirect("/app/settings/account#data");
}
