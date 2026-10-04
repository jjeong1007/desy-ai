import type { BuildPath, CriterionDef, FilterId, PillarDef, PillarId, RwwQuestionDef } from "@/types";

/** Filter labels come from "Scoring Opportunities with Filters" (M2 lecture). */
export const FILTERS: { id: FilterId; label: string; short: string; question: string }[] = [
  { id: "customer", label: "Customer Filter", short: "Customer", question: "Is there a clear customer with a real, frequent problem?" },
  { id: "economic", label: "Economic Filter", short: "Economic", question: "Can this make money for a solo founder?" },
  { id: "competition", label: "Competition Filter", short: "Competition", question: "Is there room to win against what exists?" },
  { id: "channel", label: "Channel Filter", short: "Channel", question: "Can you reach customers affordably?" },
  { id: "timing", label: "Timing Filter", short: "Timing", question: "Is now the right time?" },
];
export const FILTER_SHORT: Record<FilterId, string> = Object.fromEntries(FILTERS.map((f) => [f.id, f.short])) as Record<FilterId, string>;
export const FILTER_IDS: FilterId[] = FILTERS.map((f) => f.id);

const F = ["filters"];

/**
 * The 25 criteria. `label` is the slide label word for word; `soloReading` is Desy's interpretation.
 */
export const CRITERIA: CriterionDef[] = [
  // Customer
  { id: "cust.identifiable", filter: "customer", label: "Clearly identifiable customer", soloReading: "The segment can be named precisely (role, company type) and found.", derivation: "judged", frameworkIds: [...F, "jtbd"], nextStep: "Name the exact segment: role, company type, and one place they gather", testPrompt: "Can you describe the last person who had this problem: their role, business, and size?" },
  { id: "cust.problem", filter: "customer", label: "Clearly identified problem", soloReading: "The problem can be stated as a job to be done, and today's workaround is known.", derivation: "judged", frameworkIds: [...F, "jtbd"], nextStep: "Write the job to be done and confirm today's workaround with 5 customers", testPrompt: "Walk me through the last time this came up. What were you trying to get done?" },
  { id: "cust.frequent", filter: "customer", label: "Frequently experienced problem", soloReading: "A daily or weekly problem scores high; a yearly one scores low.", derivation: "judged", frameworkIds: [...F, "jtbd"], nextStep: "Measure how often the problem happens by asking about the last 30 days", testPrompt: "How many times did this happen in the last month?" },
  { id: "cust.sizable", filter: "customer", label: "Sizable customer base", soloReading: "Obtainable customers comfortably exceed the number needed to hit the MRR goal (from Path to MRR).", derivation: "sizable", frameworkIds: [...F, "market-sizing"], nextStep: "Firm up the obtainable-customer estimate with a bottom-up count", testPrompt: "Roughly how many people like you do you know who deal with this?" },
  { id: "cust.accessible", filter: "customer", label: "Accessible customer base", soloReading: "Customers gather in identifiable communities, platforms, or lists.", derivation: "judged", frameworkIds: [...F, "channels"], nextStep: "List three communities where these customers talk shop and join them", testPrompt: "Where do you go to ask other people in your line of work for advice?" },
  // Economic
  { id: "econ.monetization", filter: "economic", label: "Clear monetization approach", soloReading: "It is clear who pays and which pricing model applies, and comparable price points exist.", derivation: "judged", frameworkIds: [...F, "wtp"], nextStep: "Confirm who pays and test a price point against 3 comparable tools", testPrompt: "What do you pay for tools in this part of your work today, and who approves it?" },
  { id: "econ.devCost", filter: "economic", label: "Low development costs", soloReading: "The founder can get it built and maintained within their weekly hours, budget, and timeline.", derivation: "judged", frameworkIds: [...F, "opportunity-assessment"], nextStep: "Scope the smallest buildable version and estimate it against your hours and budget", testPrompt: "(Founder check) Which feature would take longest to build, and can you prototype it in a weekend?" },
  { id: "econ.variableCost", filter: "economic", label: "Low variable costs", soloReading: "Per-customer running costs (AI/API usage, infrastructure, no-code platform fees, support) are small relative to price.", derivation: "judged", frameworkIds: F, nextStep: "Price out per-customer API, hosting and platform fees at 10 and 100 customers", testPrompt: "(Founder check) What does one active customer cost you per month to serve?" },
  { id: "econ.margins", filter: "economic", label: "Healthy margins", soloReading: "Estimated gross margin after variable costs.", derivation: "margin", frameworkIds: [...F, "wtp"], nextStep: "Raise price or cut per-customer costs to lift gross margin", testPrompt: "If this saved you that time, what would feel like a fair monthly price?" },
  { id: "econ.scale", filter: "economic", label: "Economies of scale", soloReading: "Cost and support effort per customer fall as customer count grows.", derivation: "judged", frameworkIds: F, nextStep: "Identify which support tasks can be self-serve before customer 50", testPrompt: "(Founder check) What breaks first when you go from 10 to 100 customers?" },
  // Competition
  { id: "comp.substitutes", filter: "competition", label: "Weak existing substitutes", soloReading: "Includes spreadsheets, manual workarounds, and \"do nothing,\" not only direct products.", derivation: "judged", frameworkIds: [...F, "opportunity-assessment"], nextStep: "Interview users of the top substitute and list what they hate about it", testPrompt: "What have you tried to fix this? What did you like and dislike about it?" },
  { id: "comp.defensible", filter: "competition", label: "Defensible position", soloReading: "Niche focus, workflow lock-in, accumulated data, or domain expertise.", derivation: "judged", frameworkIds: F, nextStep: "Pick a niche narrow enough that general tools ignore it", testPrompt: "What would make switching away from a tool like this painful for you?" },
  { id: "comp.leader", filter: "competition", label: "No clear market leader", soloReading: "No dominant player owns the segment.", derivation: "judged", frameworkIds: F, nextStep: "Check review volumes to see whether one player dominates your niche", testPrompt: "If a peer asked what to use for this, what would you tell them?" },
  { id: "comp.resources", filter: "competition", label: "Resource-constrained competitors", soloReading: "Competitors are small or unfunded rather than well-funded incumbents. Scored from funding findings.", derivation: "judged", frameworkIds: F, nextStep: "Check funding history for the top 5 competitors", testPrompt: "(Desk research) Which competitors have raised money in the last two years?" },
  { id: "comp.ip", filter: "competition", label: "Strong IP assets", soloReading: "For solo SaaS, read as proprietary data, integrations, or specialist knowledge.", derivation: "judged", frameworkIds: F, nextStep: "Name one integration, dataset, or expertise competitors can't copy quickly", testPrompt: "What do you know about this work that an outsider would get wrong?", note: "Low scores here are normal for solo SaaS." },
  // Channel
  { id: "chan.route", filter: "channel", label: "Clear route to market", soloReading: "There is at least one specific, nameable acquisition channel.", derivation: "judged", frameworkIds: [...F, "channels"], nextStep: "Pick one acquisition channel and run a 2-week test", testPrompt: "How did you find the last tool you started paying for at work?" },
  { id: "chan.access", filter: "channel", label: "Good access to channels", soloReading: "The founder already has an audience, network, or presence there.", derivation: "judged", frameworkIds: [...F, "channels"], nextStep: "Write down your existing audience and network in each channel", testPrompt: "(Founder check) Where do you already have an audience, network, or reputation?" },
  { id: "chan.whiteLabel", filter: "channel", label: "White label opportunities", soloReading: "For solo SaaS, read as partnerships, integrations, app marketplaces, or resellers.", derivation: "judged", frameworkIds: [...F, "channels"], nextStep: "List app marketplaces and partners your customers already use", testPrompt: "Which tools do you use every day that this would need to connect to?" },
  { id: "chan.online", filter: "channel", label: "Online channel strong", soloReading: "Customers search for and discuss this problem online.", derivation: "judged", frameworkIds: [...F, "channels"], nextStep: "Check search volume and recent threads for the problem phrased in customer words", testPrompt: "What did you search for the last time you tried to solve this?" },
  { id: "chan.cac", filter: "channel", label: "Low cost to acquire customers", soloReading: "Estimated CAC is low relative to monthly price. Shown as CAC payback in months.", derivation: "cacPayback", frameworkIds: [...F, "channels"], nextStep: "Lower CAC with an organic channel or raise price to shorten payback", testPrompt: "Would you try a tool like this from a peer recommendation, a search, or an ad?" },
  // Timing
  { id: "time.trends", filter: "timing", label: "Strong alignment with trends", soloReading: "Search and discussion volume is moving in the right direction.", derivation: "judged", frameworkIds: [...F, "opportunity-assessment"], nextStep: "Track 12-month search and discussion volume for your core terms", testPrompt: "Has this problem gotten better or worse for you in the last year? Why?" },
  { id: "time.infra", filter: "timing", label: "Infrastructure in place", soloReading: "The required APIs, platforms, and data sources exist today. For AI/no-code builds, also checks the needed integrations exist in those tools.", derivation: "judged", frameworkIds: F, nextStep: "Confirm every required API or integration exists and test it", testPrompt: "(Founder check) Which APIs or integrations does the core feature depend on?" },
  { id: "time.educated", filter: "timing", label: "Customers educated on category", soloReading: "Customers already buy or use something similar.", derivation: "judged", frameworkIds: [...F, "wtp"], nextStep: "Confirm customers already pay for something in this category", testPrompt: "Have you ever paid for a tool to help with this? Which one?" },
  { id: "time.tipping", filter: "timing", label: "Market at tipping point in adoption", soloReading: "Adoption is rising but not saturated.", derivation: "judged", frameworkIds: F, nextStep: "Compare new-entrant launches vs. shutdowns over the last 2 years", testPrompt: "How many people you work with use a tool for this today?" },
  { id: "time.regulatory", filter: "timing", label: "No regulatory \"gotchas\"", soloReading: "No licensing, compliance, or data-protection blockers for a solo founder.", derivation: "judged", frameworkIds: F, nextStep: "List the data you'll store and check consent and privacy rules that apply", testPrompt: "Are there rules about how you store or share this kind of information?" },
];

export const CRITERION_BY_ID: Record<string, CriterionDef> = Object.fromEntries(CRITERIA.map((c) => [c.id, c]));

export function soloReadingFor(def: CriterionDef, buildPath: BuildPath | null): string {
  if (def.id === "econ.devCost") {
    const paths: Record<BuildPath, string> = {
      selfCoded: "Self-coded: judged on whether the build fits your weekly hours and timeline.",
      aiNoCode: "AI/no-code: judged on whether the required features fit those tools' limits.",
      hiredDeveloper: "Hired developer: judged on build budget versus total budget.",
      notSure: "Build path not chosen yet, so this stays Needs evidence.",
    };
    return `${def.soloReading} ${buildPath ? paths[buildPath] : ""}`.trim();
  }
  if (def.id === "time.infra" && buildPath === "aiNoCode") {
    return `${def.soloReading} You chose AI/no-code tools, so integrations in those tools are checked too.`;
  }
  return def.soloReading;
}

export const PILLARS: PillarDef[] = [
  { id: "real", label: "Real", question: "Is there a real market and a real product?", definition: "Customers have a genuine need, can and will pay to solve it, and a product that meets that need can actually be built.", fit: "Product/market fit", drawsOn: ["customer", "timing"] },
  { id: "win", label: "Win", question: "Can this founder's product be competitive?", definition: "Your product can beat today's alternatives, and you have the skills, time and channels to win customers and keep them.", fit: "Product/company fit (the company is you)", drawsOn: ["competition", "channel"] },
  { id: "worthIt", label: "Worth It", question: "Is the return adequate and the risk acceptable?", definition: "The revenue you can realistically reach justifies the time, money and risk it takes, within your timeline and budget.", fit: "Product/business fit", drawsOn: ["economic"] },
];
export const PILLAR_BY_ID: Record<PillarId, PillarDef> = Object.fromEntries(PILLARS.map((p) => [p.id, p])) as Record<PillarId, PillarDef>;

/** Sub-questions adapted from 3M's RWW checklist. Critical flags are Desy's. */
export const RWW_QUESTIONS: RwwQuestionDef[] = [
  { id: "real.need", pillar: "real", text: "Is there a need, and how is it satisfied today?", critical: true, nextStep: "Document today's workaround from 5 recent cases", testPrompt: "How do you handle this today, step by step?" },
  { id: "real.canBuy", pillar: "real", text: "Can the customer buy? (market size, who decides)", critical: false, nextStep: "Confirm who approves spend on tools like this", testPrompt: "Who decides when you start paying for a new tool?" },
  { id: "real.willBuy", pillar: "real", text: "Will the customer buy? (perceived risk vs. benefit, price expectations)", critical: true, nextStep: "Get 3 customers to agree to a paid pilot or pre-order", testPrompt: "What did you last pay to make this problem go away, in time or money?" },
  { id: "real.feasible", pillar: "real", text: "Is the concept feasible with available technology?", critical: true, nextStep: "Prototype the riskiest technical piece", testPrompt: "(Founder check) Can you build the core flow with today's APIs?" },
  { id: "real.acceptable", pillar: "real", text: "Is it acceptable within social, legal, and platform norms?", critical: false, nextStep: "Check platform terms and consent rules for your core feature", testPrompt: "Would your clients or colleagues be comfortable with this being automated?" },
  { id: "real.barriers", pillar: "real", text: "Are adoption barriers acceptable?", critical: false, nextStep: "Map the setup steps a new customer must take before seeing value", testPrompt: "What would stop you from switching to a new tool for this?" },
  { id: "win.advantage", pillar: "win", text: "Is there a sustainable advantage?", critical: true, nextStep: "Define one advantage a funded competitor can't copy in a quarter", testPrompt: "What's missing from the tools you've tried?" },
  { id: "win.timing", pillar: "win", text: "Is the timing right?", critical: false, nextStep: "Name the change that makes this possible or needed now", testPrompt: "What's changed in your work in the last year that made this harder?" },
  { id: "win.beat", pillar: "win", text: "Can it beat current and likely competitors?", critical: false, nextStep: "Interview 3 people who churned from a competitor", testPrompt: "Why did you stop using the last tool you tried for this?" },
  { id: "win.skills", pillar: "win", text: "Does the founder have the skills to build and sell it?", critical: false, nextStep: "List the build and sales skills you'll need and fill the biggest gap", testPrompt: "(Founder check) Which part of building or selling this have you never done?" },
  { id: "win.committed", pillar: "win", text: "Is the founder committed enough (hours, timeline) to win?", critical: false, nextStep: "Block weekly hours on your calendar for the next 8 weeks", testPrompt: "(Founder check) Can you sustain these hours for 6 months?" },
  { id: "win.knows", pillar: "win", text: "Does the founder know these customers as well as competitors do?", critical: false, nextStep: "Run 10 customer conversations before writing code", testPrompt: "What surprised you most about how you handle this today?" },
  { id: "worth.money", pillar: "worthIt", text: "Will it make money? (Path to MRR is achievable within the obtainable market)", critical: true, derivation: "money", nextStep: "Close the gap between customers needed and obtainable market", testPrompt: "If this cost $X a month, would that be an easy yes, a maybe, or a no?" },
  { id: "worth.resources", pillar: "worthIt", text: "Does the founder have the budget and hours to do this?", critical: true, nextStep: "Build a 6-month budget including tools, ads, and any developer costs", testPrompt: "(Founder check) What's your total budget and monthly runway for this?" },
  { id: "worth.risks", pillar: "worthIt", text: "Are the risks acceptable? (technical vs. market risk)", critical: false, nextStep: "Name the single biggest risk and design a cheap test for it", testPrompt: "(Founder check) What would have to be true for this to fail?" },
  { id: "worth.fit", pillar: "worthIt", text: "Does it fit the founder's goal (MRR target, timeline, leaving the 9-to-5)?", critical: false, nextStep: "Check the MRR goal against a realistic customer ramp", testPrompt: "(Founder check) Does the timeline to your MRR goal fit when you want to leave your job?" },
];
export const RWW_BY_ID: Record<string, RwwQuestionDef> = Object.fromEntries(RWW_QUESTIONS.map((q) => [q.id, q]));
