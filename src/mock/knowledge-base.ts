import type { KnowledgeEntry } from "@/types";
import { CRITERIA, FILTERS, RWW_QUESTIONS } from "@/config/criteria";

/**
 * Mock knowledge base. Each entry separates what the course material says (fromSource)
 * from how Desy operationalizes it (desyAssumptions). Replace entries with real documents later;
 * components only depend on the KnowledgeEntry shape and the ids below.
 */
export const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    id: "filters",
    title: "Scoring Opportunities with Filters",
    source: "M2 lecture, Assessing Opportunities",
    explanation:
      "Screens an opportunity through five filters (Customer, Economic, Competition, Channel, Timing), each with five criteria. A strong opportunity passes most filters; a single badly failing filter can sink an otherwise attractive idea.",
    fromSource: [
      `Five filters: ${FILTERS.map((f) => f.short).join(", ")}.`,
      ...FILTERS.map((f) => `${f.label}: ${CRITERIA.filter((c) => c.filter === f.id).map((c) => c.label).join("; ")}.`),
    ],
    desyAssumptions: [
      "Solo SaaS readings reinterpret corporate criteria for a one-person business (e.g. Strong IP assets → proprietary data, integrations or specialist knowledge).",
      "Each criterion is scored 0–4: 0 evidence contradicts it; 1 weak or single-source; 2 mixed; 3 supported; 4 strongly supported by multiple independent sources.",
      "No supporting findings → \"Needs evidence\" (null), excluded from the filter average.",
      "Filter score = sum of scored criteria ÷ (4 × number scored) × 100, rounded.",
      "Desy Score = weighted mean of non-null filters. Equal 20% weights by default; the course does not specify weights.",
      "Bands: Strong 70–100, Promising 45–69, Weak 0–44. Knockout filter below 40. Low confidence when 3+ criteria need evidence.",
      "Band caps: any RWW pillar = No → Weak; any knockout filter → Promising; any low-confidence filter → Promising. Lowest cap wins; caps never change the score.",
    ],
  },
  {
    id: "rww",
    title: "Real / Win / Worth It",
    source: "M2 lecture, Three Dimensions of Fit; Screening Opportunities reading (3M RWW checklist)",
    explanation:
      "A screening checklist that asks whether the market and product are real, whether the company can win, and whether it's worth doing. In Desy it is a gate on whether this founder should pursue the opportunity, separate from how attractive the market is.",
    fromSource: [
      "Real = product/market fit. Win = product/company fit. Worth It = product/business fit.",
      "3M's checklist asks each sub-question and assigns each pillar a net answer by judgment.",
      ...RWW_QUESTIONS.map((q) => `${q.pillar === "worthIt" ? "Worth It" : q.pillar === "real" ? "Real" : "Win"}: ${q.text}`),
    ],
    desyAssumptions: [
      "\"Company\" means the solo founder: skills, hours, budget, and build path.",
      "Net answer: No if any critical sub-question is No; Yes if all Yes or only one Maybe; Probably otherwise. Unanswered counts as Maybe. (Consistent with the reading's Spoil My Spouse example, but not taken from it.)",
      `Critical sub-questions: ${RWW_QUESTIONS.filter((q) => q.critical).map((q) => q.text.split(" (")[0]).join(" · ")}.`,
      "Consistency caps: Real can't be Yes with Customer below 50; Win can't be Yes with Competition below 40; Worth It can't be Yes if Path to MRR needs more customers than the obtainable market.",
      "RWW never changes the Desy Score. A pillar = No caps the band at Weak.",
    ],
  },
  {
    id: "market-sizing",
    title: "Market sizing (TAM / SAM / SOM)",
    source: "M2 lecture, Everything MRD & Customers",
    explanation:
      "Total addressable market is everyone who could use the product; serviceable addressable is the slice you can serve; serviceable obtainable is what you can realistically win. Top-down starts from industry totals; bottom-up multiplies reachable customers by price.",
    fromSource: ["TAM, SAM and SOM describe progressively narrower markets.", "Estimate both top-down and bottom-up and compare them."],
    desyAssumptions: [
      "For solo SaaS, SOM is expressed as obtainable paying customers within the founder's timeline, because that's what Path to MRR compares against.",
      "Obtainable ÷ needed of 10× or more scores 4 on Sizable customer base; 4× → 3; 2× → 2; 1× → 1; below 1× → 0.",
    ],
  },
  {
    id: "opportunity-assessment",
    title: "Product opportunity assessment",
    source: "Assessing Product Opportunities reading",
    explanation:
      "Ten questions to answer before building: the problem, the target market, its size, alternatives, your differentiator, why now, go-to-market, metrics and revenue, critical success factors, and a recommendation.",
    fromSource: [
      "1 Exactly what problem will this solve? 2 For whom? 3 How big is the opportunity? 4 What alternatives are out there? 5 Why are we best suited? 6 Why now? 7 How will we get it to market? 8 How will we measure success and make money? 9 What factors are critical to success? 10 Given the above, what's the recommendation?",
    ],
    desyAssumptions: ["Desy answers question 10 with a score and pursuit band rather than a go/no-go call."],
  },
  {
    id: "channels",
    title: "Distribution channel evaluation",
    source: "Desy knowledge base (course discussion of channel filters)",
    explanation:
      "A channel is only useful if customers are actually there, you can get in front of them, and the cost to acquire a customer pays back quickly relative to price.",
    fromSource: ["Channel filter criteria: clear route to market, access to channels, white label opportunities, online channel strength, low cost to acquire."],
    desyAssumptions: [
      "Channels are ranked by fit (0–100) combining audience presence, founder access, and estimated effort.",
      "CAC payback = estimated CAC ÷ (price − running cost per customer). ≤3 months scores 4; ≤6 → 3; ≤12 → 2; ≤24 → 1.",
    ],
  },
  {
    id: "wtp",
    title: "Willingness-to-pay signals",
    source: "Validating Your Decisions Using Surveys; MVP Testing readings",
    explanation:
      "What people already pay for, and what they did the last time they had the problem, predicts payment better than what they say they would pay.",
    fromSource: ["Ask about money and time already spent on the problem.", "Stated intent overestimates purchase behavior."],
    desyAssumptions: ["Existing paid tools in the category raise Customers educated on category and Clear monetization approach."],
  },
  {
    id: "jtbd",
    title: "Jobs to Be Done",
    source: "Finding the Right Job for Your Product (reading)",
    explanation:
      "Customers hire a product to make progress in a specific situation. Describe the job as situation, motivation, and expected outcome, and learn what they fire to hire you.",
    fromSource: ["When I [situation], I want to [motivation], so I can [expected outcome].", "Interview about the moment of switching: what triggered it and what they gave up."],
    desyAssumptions: ["Clearly identified problem requires the job and today's workaround to be stated."],
  },
  {
    id: "discovery",
    title: "Customer discovery interview practice",
    source: "PM101 Early Customer Research; How to Structure Customer Development Interviews",
    explanation:
      "Good discovery interviews ask about specific past behavior, avoid leading questions, and hold the pitch until the end so the conversation stays about the customer's world.",
    fromSource: ["Ask about the last time it happened, not whether they'd use something.", "Don't lead the witness.", "Pitch last, if at all."],
    desyAssumptions: ["Every generated question is tagged with the criterion or RWW sub-question it tests, so answers can update the score."],
  },
  {
    id: "pitch",
    title: "Pitch quality criteria",
    source: "Desy knowledge base (course pitch guidance)",
    explanation: "A clear pitch names the problem and who has it, why now, the solution, why you, and a concrete ask, with each claim backed by evidence.",
    fromSource: ["Problem, customer, why now, solution, why you, the ask."],
    desyAssumptions: ["Problem and customer map to Real; why now to Timing; why you to Win; the ask and economics to Worth It."],
  },
];

export const KB_BY_ID: Record<string, KnowledgeEntry> = Object.fromEntries(KNOWLEDGE_BASE.map((k) => [k.id, k]));
