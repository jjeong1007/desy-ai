"use client";
import { useParams } from "next/navigation";
import { PlannerForIdea } from "@/components/planner/planner-pages";

export default function IdeaPlannerPage() {
  const { id } = useParams<{ id: string }>();
  return <PlannerForIdea id={id} />;
}
