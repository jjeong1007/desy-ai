import type { SourceCategory, SourceDef } from "@/types";

/**
 * Source registry. Every data source is defined once here.
 * The marketing site names only sources with accessConfirmed: true; until real
 * integrations ship it speaks in categories. Flip a flag when an integration lands.
 * SEC EDGAR is intentionally excluded: small private SaaS competitors rarely file.
 */
export const SOURCES: SourceDef[] = [
  { id: "reddit", name: "Reddit", category: "Community forums", agentId: "community", accessConfirmed: false },
  { id: "hackernews", name: "Hacker News", category: "Community forums", agentId: "community", accessConfirmed: false },
  { id: "indiehackers", name: "Indie Hackers", category: "Community forums", agentId: "community", accessConfirmed: false },
  { id: "github", name: "GitHub", category: "Open-source repositories", agentId: "builder", accessConfirmed: false },
  { id: "builders", name: "AI and no-code builders", category: "Builder platforms", agentId: "builder", accessConfirmed: false },
  { id: "producthunt", name: "Product Hunt", category: "Product directories and review sites", agentId: "competitor", accessConfirmed: false },
  { id: "g2", name: "G2", category: "Product directories and review sites", agentId: "competitor", accessConfirmed: false },
  { id: "crunchbase", name: "Crunchbase", category: "Licensed market databases", agentId: "competitor", accessConfirmed: false },
  { id: "pitchbook", name: "PitchBook", category: "Licensed market databases", agentId: "competitor", accessConfirmed: false },
  { id: "statista", name: "Statista", category: "Licensed market databases", agentId: "market", accessConfirmed: false },
  { id: "googletrends", name: "Google Trends", category: "Search-trend data", agentId: "market", accessConfirmed: false },
  { id: "techcrunch", name: "TechCrunch", category: "Startup and funding news", agentId: "signal", accessConfirmed: false },
  { id: "linkedin", name: "LinkedIn", category: "Startup and funding news", agentId: "signal", accessConfirmed: false },
  { id: "interviews", name: "Your interviews", category: "Founder research", agentId: "founder", accessConfirmed: true },
];

/** Categories the marketing site may describe without naming vendors. */
export const PUBLIC_CATEGORIES: { category: SourceCategory; description: string }[] = [
  { category: "Community forums", description: "Threads where your customers describe the problem in their own words." },
  { category: "Open-source repositories", description: "Free alternatives that set a price ceiling and show what's hard to build." },
  { category: "Product directories and review sites", description: "Competitors, their pricing, and what reviewers complain about." },
  { category: "Search-trend data", description: "Whether interest in the problem is rising, flat, or fading." },
  { category: "Startup and funding news", description: "Who just raised money in your space, and who is hiring." },
];

const byId = new Map(SOURCES.map((s) => [s.id, s]));
export function getSource(id: string): SourceDef {
  return byId.get(id) ?? { id, name: id, category: "Community forums", agentId: "community", accessConfirmed: false };
}
export function publicSources(): SourceDef[] {
  return SOURCES.filter((s) => s.accessConfirmed && s.agentId !== "founder");
}
