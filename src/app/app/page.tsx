import type { Metadata } from "next";
import { Home } from "@/components/app/home";

export const metadata: Metadata = { title: "Home" };

export default function HomePage() {
  return <Home />;
}
