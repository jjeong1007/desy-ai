import type { Metadata } from "next";
import { AgentRun } from "@/components/app/agent-run";

export const metadata: Metadata = { title: "Research run" };

export default function RunPage() {
  return <AgentRun />;
}
