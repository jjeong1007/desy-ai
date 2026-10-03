import type { AgentId } from "@/types";

export const AGENTS: { id: AgentId; name: string; job: string; sourceIds: string[] }[] = [
  { id: "market", name: "Market Agent", job: "Sizes the market and reads search trends", sourceIds: ["statista", "googletrends"] },
  { id: "competitor", name: "Competitor Agent", job: "Maps competitors, pricing and funding", sourceIds: ["crunchbase", "pitchbook", "g2", "producthunt"] },
  { id: "community", name: "Community Agent", job: "Finds people describing the problem", sourceIds: ["reddit", "hackernews", "indiehackers"] },
  { id: "builder", name: "Builder Agent", job: "Checks open-source alternatives and build feasibility", sourceIds: ["github", "builders"] },
  { id: "signal", name: "Signal Agent", job: "Reads funding news and hiring trends", sourceIds: ["techcrunch", "linkedin"] },
  { id: "framework", name: "Framework Agent", job: "Applies the knowledge-base frameworks to the findings", sourceIds: [] },
];

export const AGENT_NAME: Record<AgentId, string> = Object.fromEntries(AGENTS.map((a) => [a.id, a.name])) as Record<AgentId, string>;
