// Single source of truth for every shared type in Desy.
// Services return these; components consume them. A real API should return the same shapes.

export type FilterId = "customer" | "economic" | "competition" | "channel" | "timing";
export type PillarId = "real" | "win" | "worthIt";
export type BuildPath = "selfCoded" | "aiNoCode" | "hiredDeveloper" | "notSure";
export type Familiarity = "iAmOne" | "workedWith" | "talkedToFew" | "outsideView";
export type Confidence = "high" | "medium" | "low";
export type CriterionValue = 0 | 1 | 2 | 3 | 4;
export type RwwAnswer = "yes" | "maybe" | "no";
export type RwwNet = "yes" | "probably" | "no";
export type PursuitBand = "strong" | "promising" | "weak";
export type Sentiment = "supports" | "weakens" | "neutral";
export type IdeaStatus = "draft" | "running" | "complete";

// ---------- Static definitions (config) ----------

/** How a criterion's score is produced. "judged" = agent judgment from evidence; others are computed from numbers. */
export type CriterionDerivation = "judged" | "sizable" | "margin" | "cacPayback";

export interface CriterionDef {
  id: string;
  filter: FilterId;
  /** Slide label, word for word from the course. */
  label: string;
  /** Desy's solo SaaS reading. */
  soloReading: string;
  derivation: CriterionDerivation;
  frameworkIds: string[];
  /** Short imperative next step used by recommendations. */
  nextStep: string;
  /** How to test it in discovery; used by the Research Planner. */
  testPrompt: string;
  note?: string;
}

export interface RwwQuestionDef {
  id: string;
  pillar: PillarId;
  text: string;
  critical: boolean;
  derivation?: "money";
  nextStep: string;
  testPrompt: string;
}

export interface PillarDef {
  id: PillarId;
  label: string;
  question: string;
  fit: string;
  drawsOn: FilterId[];
}

// ---------- Report shapes (spec 5.6) ----------

export interface CriterionScore {
  id: string;
  filter: FilterId;
  label: string;
  soloReading: string;
  score: CriterionValue | null;
  justification: string;
  findingIds: string[];
  frameworkIds: string[];
  /** Where the number came from, for display. */
  origin: "agent" | "computed" | "interview";
}

export interface FilterScore {
  id: FilterId;
  score: number | null;
  weight: number;
  confidence: Confidence;
  rationale: string;
  biggestRisk: string;
  criteria: CriterionScore[];
  unscoredCount: number;
  knockout: boolean;
  lowConfidence: boolean;
}

export interface RwwQuestion {
  id: string;
  pillar: PillarId;
  text: string;
  critical: boolean;
  answer: RwwAnswer | null;
  note: string;
  findingIds: string[];
  origin: "agent" | "computed" | "interview";
}

export interface RwwPillar {
  id: PillarId;
  net: RwwNet;
  /** Net answer before consistency caps. */
  rawNet: RwwNet;
  drawsOn: FilterId[];
  questions: RwwQuestion[];
  cappedReason?: string;
}

export interface ScoreResult {
  overall: number; // raw weighted mean, never capped
  band: PursuitBand; // after caps
  uncappedBand: PursuitBand; // band from score alone
  capReasons: string[]; // empty if no cap applied
  confidence: Confidence;
  reason: string; // one sentence, deciding factor
  knockoutFilters: FilterId[];
  lowConfidenceFilters: FilterId[];
}

export interface PathToMrr {
  price: number;
  mrrGoal: number;
  customersNeeded: number;
  obtainable: number | null;
  ratio: number | null;
  variableCost: number;
  marginPct: number;
  cac: number;
  cacPaybackMonths: number | null;
}

export interface Report {
  ideaId: string;
  filters: FilterScore[];
  pillars: RwwPillar[];
  score: ScoreResult;
  weights: Record<FilterId, number>;
  pathToMrr: PathToMrr;
  coverage: { scored: number; withEvidence: number; total: number; sources: number };
}

// ---------- Ideas, intake, analysis ----------

export interface IntakeInput {
  name: string;
  oneLiner: string;
  problem: string;
  targetCustomer: string;
  currentSolution: string;
  solution: string;
  keyFeatures: string;
  price: number;
  mrrGoal: number;
  timelineMonths: number;
  runningCost: number | null;
  whyNow: string;
  regulatory: string;
  skills: string;
  weeklyHours: number;
  budget: number;
  buildPath: BuildPath | null;
  buildBudget: number | null;
  familiarity: Familiarity | null;
  distributionIdeas: string;
}

export type FindingType =
  | "competitor"
  | "marketStat"
  | "communitySignal"
  | "trend"
  | "fundingEvent"
  | "openSource"
  | "builderCapability"
  | "interview";

export type AgentId = "market" | "competitor" | "community" | "builder" | "signal" | "framework";

export interface Finding {
  id: string;
  title: string;
  sourceId: string;
  agentId: AgentId;
  type: FindingType;
  summary: string;
  excerpt: string;
  url: string;
  retrievedAt: string; // ISO
  confidence: Confidence;
  sentiment: Sentiment;
  criterionIds: string[];
  rwwIds: string[];
}

export interface CriterionJudgment {
  /** Score with all findings visible. Ignored for computed criteria (the number comes from Path to MRR inputs). */
  base: CriterionValue | null;
  justification: string;
  findingIds: string[];
}

export interface RwwJudgment {
  base: RwwAnswer | null;
  note: string;
  findingIds: string[];
}

export interface Competitor {
  name: string;
  pricing: string;
  segment: string;
  strengths: string;
  gaps: string;
  funding: string;
}

export interface MarketSizing {
  topDown: { tam: number; sam: number; som: number; assumptions: string[] };
  bottomUp: { tam: number; sam: number; som: number; assumptions: string[] };
  /** Obtainable paying customers within the founder's timeline. Feeds Path to MRR. */
  obtainableCustomers: number;
  unit: string;
}

export interface TrendPoint { month: string; value: number }

export interface PainPoint { theme: string; mentions: number; quotes: { text: string; sourceId: string }[] }

export interface UnitEconomics {
  /** Estimated cost to acquire one customer, USD. */
  cac: number;
  variableCost: number;
  supportHoursPerCustomer: number;
  buildCost: number | null;
}

export interface Channel {
  id: string;
  name: string;
  fit: number; // 0-100
  effort: "low" | "medium" | "high";
  reason: string;
  findingIds: string[];
}

export interface AlternativeDirection {
  id: string;
  name: string;
  oneLiner: string;
  why: string;
  improves: string; // e.g. "Competition filter, Win"
  profile: Record<FilterId, number>;
  intakePatch: Partial<IntakeInput>;
}

export interface Analysis {
  generatedAt: string;
  criteria: Record<string, CriterionJudgment>;
  rww: Record<string, RwwJudgment>;
  findings: Finding[];
  filterNotes: Record<FilterId, { rationale: string; biggestRisk: string }>;
  competitors: Competitor[];
  market: MarketSizing;
  trend: { term: string; points: TrendPoint[] };
  painPoints: PainPoint[];
  unit: UnitEconomics;
  channels: Channel[];
  alternatives: AlternativeDirection[];
  personas: Persona[];
  partialFailure: AgentId | null;
}

export interface FindingState {
  pinned: boolean;
  hidden: boolean;
  note: string;
}

export interface Adjustments {
  criteria: Record<string, { score: CriterionValue | null; note: string; findingIds: string[] }>;
  rww: Record<string, { answer: RwwAnswer | null; note: string; findingIds: string[] }>;
}

export interface HistoryEntry {
  id: string;
  at: string;
  kind: "created" | "run" | "pathToMrr" | "hidden" | "unhidden" | "synthesis" | "edited" | "weights";
  summary: string;
  scoreBefore?: number;
  scoreAfter?: number;
  bandBefore?: PursuitBand;
  bandAfter?: PursuitBand;
}

export interface RunAgentPlan {
  id: AgentId;
  durationMs: number;
  startDelayMs: number;
  logs: string[];
  findings: number;
  outcome: "done" | "partial";
}

export interface RunPlan {
  startedAt: string;
  totalMs: number;
  agents: RunAgentPlan[];
}

export interface Idea {
  id: string;
  status: IdeaStatus;
  createdAt: string;
  updatedAt: string;
  lastRunAt: string | null;
  intake: IntakeInput;
  draftStep?: number;
  analysis: Analysis | null;
  findingState: Record<string, FindingState>;
  adjustments: Adjustments;
  run: RunPlan | null;
  history: HistoryEntry[];
  plan: ResearchPlan | null;
  seed?: boolean;
}

// ---------- Research planner ----------

export type PlanGoal = "discovery" | "pitch";

export interface PlanTarget {
  id: string;
  kind: "criterion" | "rww" | "filter" | "cap";
  refId: string;
  label: string;
  why: string;
}

export interface Persona {
  id: string;
  name: string;
  who: string;
  where: string;
  why: string;
}

export interface PlanQuestion {
  id: string;
  text: string;
  learn: string;
  tests: string; // criterion id or rww id
}

export interface PlanSection {
  id: string;
  title: string;
  items: PlanQuestion[];
}

export interface PitchSection {
  id: string;
  title: string;
  pillar: PillarId | "timing";
  body: string;
  findingIds: string[];
}

export interface Objection {
  id: string;
  objection: string;
  response: string;
  source: string; // which weakness produced it
  findingIds: string[];
}

export interface InterviewNote {
  id: string;
  interviewee: string;
  personaId: string;
  date: string;
  text: string;
}

export type AssumptionStatus = "validated" | "invalidated" | "unclear";

export interface TrackedAssumption {
  id: string;
  refKind: "criterion" | "rww";
  refId: string;
  label: string;
  status: AssumptionStatus;
  evidence: { noteId: string; snippet: string }[];
}

export interface Synthesis {
  at: string;
  themes: { theme: string; count: number; noteIds: string[] }[];
  quotes: { text: string; noteId: string; interviewee: string }[];
  assumptions: TrackedAssumption[];
  appliedAt: string | null;
}

export interface ResearchPlan {
  goal: PlanGoal;
  generatedAt: string;
  targets: PlanTarget[];
  personas: Persona[];
  screener: PlanQuestion[];
  script: PlanSection[];
  outreach: string;
  pitch: PitchSection[];
  objections: Objection[];
  notes: InterviewNote[];
  synthesis: Synthesis | null;
}

// ---------- Settings / session ----------

export interface Settings {
  weights: Record<FilterId, number>;
  theme: "light" | "dark" | "system";
  profile: { name: string; email: string; role: string };
  reducedMotionRuns: boolean;
  /** Demo control for the agent run: random (~30%), always, or never return a partial agent failure. */
  partialFailure: "random" | "always" | "never";
}

export interface Session {
  email: string;
  name: string;
  signedInAt: string;
}

export interface SourceDef {
  id: string;
  name: string;
  category: SourceCategory;
  agentId: AgentId | "founder";
  accessConfirmed: boolean;
}

export type SourceCategory =
  | "Community forums"
  | "Open-source repositories"
  | "Product directories and review sites"
  | "Search-trend data"
  | "Startup and funding news"
  | "Licensed market databases"
  | "Builder platforms"
  | "Founder research";

export interface KnowledgeEntry {
  id: string;
  title: string;
  source: string;
  explanation: string;
  fromSource: string[];
  desyAssumptions: string[];
}
