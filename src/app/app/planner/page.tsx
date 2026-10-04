import type { Metadata } from "next";
import { PlannerIndex } from "@/components/planner/planner-pages";

export const metadata: Metadata = { title: "Research Planner" };

export default function PlannerPage() {
  return <PlannerIndex />;
}
