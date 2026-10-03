/**
 * Simulated research for newly submitted ideas. Builds believable findings and judgments from
 * templates that use the founder's inputs. It writes only evidence and 0-4 judgments; every score,
 * band and cap is computed by services/scoring.ts.
 */
import { FILTER_IDS } from "@/config/criteria";
import { SCORING_CONFIG } from "@/config/scoring";
import { computeReport } from "@/services/scoring";
import { rng } from "@/lib/utils";
import type {
  AgentId,
  AlternativeDirection,
  Analysis,
  Channel,
  Competitor,
  CriterionJudgment,
  CriterionValue,
  FilterId,
  Finding,
  FindingType,
  IntakeInput,
  Persona,
  RwwAnswer,
  RwwJudgment,
  Sentiment,
} from "@/types";
import { buildFindings, linkFindings, trendSeries, type FindingSpec } from "./seed-helpers";

const NAMES = ["Brightloop", "Tallyhive", "Northdesk", "Quillstack", "Plainpath", "Ferncast", "Kitewise", "Orbitly", "Mossgrid", "Halcyon Desk", "Pinecart", "Lumenly", "Copperleaf", "Sparrowbase", "Tidewell", "Fieldwork HQ"];

const short = (s: string, n = 48) => (s.length > n ? `${s.slice(0, n - 1).trim()}…` : s);
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const has = (s: string, re: RegExp) => re.test(s.toLowerCase());

function keyword(i: IntakeInput) {
  const words = (i.problem || i.oneLiner || i.name).toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((w) => w.length > 4 && !["their", "about", "which", "these", "people", "would", "every", "there", "being"].includes(w));
  return words.slice(0, 2).join(" ") || lower(i.name);
}

export function generateAnalysis(i: IntakeInput, opts: { seedKey: string; forcePartial?: boolean | null; now?: string }): Analysis {
  const r = rng(`${opts.seedKey}:${i.name}:${i.targetCustomer}`);
  const now = opts.now ?? new Date().toISOString();
  const kw = keyword(i);
  const cust = short(i.targetCustomer || "your target customers", 60);
  const custL = lower(cust);
  const names = r.shuffle(NAMES).slice(0, 4);
  const price = i.price || 10;
  const partialFailure: AgentId | null = opts.forcePartial === true ? "market" : opts.forcePartial === false ? null : r.next() < 0.3 ? "market" : null;

  // --- judgments ---------------------------------------------------------
  const specific = (i.targetCustomer.split(/\s+/).length >= 6 ? 1 : 0) - (has(i.targetCustomer, /\b(anyone|everyone|all )\b/) ? 2 : 0);
  const identifiable = (specific >= 1 ? 3 : specific === 0 ? 2 : 1) as CriterionValue;
  const problemScore = (i.currentSolution.trim().length > 20 ? 3 : 2) as CriterionValue;
  const freqText = `${i.problem} ${i.currentSolution}`;
  const frequent = (has(freqText, /daily|every day|each day/) ? 4 : has(freqText, /week|every|constantly|always/) ? 3 : has(freqText, /month/) ? 2 : has(freqText, /year|annual/) ? 1 : 2) as CriterionValue;
  const accessible = (i.distributionIdeas.trim().length > 10 ? 3 : 2) as CriterionValue;
  const monetization = (price >= 5 && price <= 200 ? 3 : 2) as CriterionValue;

  let devCost: CriterionValue | null = 2;
  let devNote = "";
  const featureCount = i.keyFeatures.split(/[;,\n]/).filter((x) => x.trim()).length;
  switch (i.buildPath) {
    case "selfCoded":
      devCost = (i.weeklyHours >= 10 ? 3 : i.weeklyHours >= 5 ? 2 : 1) as CriterionValue;
      devNote = `Self-coded with ${i.weeklyHours} hrs/week: ${devCost >= 3 ? "an MVP fits your hours and timeline" : "tight for your timeline"}.`;
      break;
    case "aiNoCode":
      devCost = (featureCount <= 4 ? 3 : 2) as CriterionValue;
      devNote = `AI/no-code: ${featureCount} key features; ${devCost >= 3 ? "they fit common builder limits" : "some features likely need workarounds"}.`;
      break;
    case "hiredDeveloper": {
      const ratio = i.buildBudget && i.budget ? i.buildBudget / i.budget : null;
      devCost = (ratio == null ? 2 : ratio <= 0.6 ? 3 : ratio <= 0.9 ? 2 : 1) as CriterionValue;
      devNote = ratio == null ? "Hired developer, build budget not given; typical MVP quotes vary widely." : `Hired developer: the build is ~${Math.round(ratio * 100)}% of your total budget.`;
      break;
    }
    default:
      devCost = null;
      devNote = "Build path not chosen yet, so build cost can't be judged.";
  }
  const vc = i.runningCost ?? price * 0.12;
  const vcShare = vc / price;
  const variableCost = (vcShare <= 0.05 ? 4 : vcShare <= 0.15 ? 3 : vcShare <= 0.3 ? 2 : vcShare <= 0.5 ? 1 : 0) as CriterionValue;
  const scale = (has(i.keyFeatures + i.solution, /support|onboarding|done.for.you|concierge|manual/) ? 2 : 3) as CriterionValue;
  const substitutes = r.int(1, 2) as CriterionValue;
  const defensible = (i.skills.trim().length > 30 || i.familiarity === "iAmOne" ? 2 : 1) as CriterionValue;
  const leader = r.int(2, 3) as CriterionValue;
  const resources = r.int(1, 3) as CriterionValue;
  const ip: CriterionValue | null = has(i.skills, /proprietary|dataset|patent|exclusive|integration partner/) ? 2 : null;
  const route = (i.distributionIdeas.trim().length > 10 ? 3 : 2) as CriterionValue;
  const access: CriterionValue | null = has(i.distributionIdeas + i.skills, /\bmy\b|audience|newsletter|followers|network|community i/) ? 3 : null;
  const whiteLabel = r.int(1, 2) as CriterionValue;
  const online = r.int(2, 3) as CriterionValue;
  const trends = (i.whyNow.trim().length > 10 ? 3 : 2) as CriterionValue;
  const infra = 3 as CriterionValue;
  const educated = 3 as CriterionValue;
  const tipping = 2 as CriterionValue;
  const regulatory = (has(i.regulatory, /hipaa|health|medical|financ|bank|minor|child|coppa|gdpr|legal/) ? 1 : i.regulatory.trim() ? 2 : 3) as CriterionValue;

  // --- findings ----------------------------------------------------------
  const specs: FindingSpec[] = [];
  const add = (id: string, src: string, type: FindingType, title: string, summary: string, excerpt: string, sentiment: Sentiment, conf: "high" | "medium" | "low" = "medium") =>
    specs.push([id, src, type, title, summary, excerpt, sentiment, [], [], conf, r.int(0, 3)]);
  const P = "gen-";
  add(`${P}f01`, "reddit", "communitySignal", `Thread: people describing ${short(kw, 30)} problems`, `Community members who match "${short(cust, 40)}" describe the problem and their workarounds.`, `Honestly I just ${lower(short(i.currentSolution || "do it by hand", 60))}. It works, barely.`, "supports", "medium");
  add(`${P}f02`, "indiehackers", "communitySignal", `Builders discuss serving ${short(custL, 36)}`, "Founders in adjacent spaces share what these customers will and won't pay for.", "They'll pay if it saves real time every week; anything 'nice to have' churns.", "supports");
  add(`${P}f03`, "linkedin", "marketStat", `Profile search for "${short(cust, 34)}"`, "Counts of self-described professionals in this segment, used for the bottom-up estimate.", `Matching profiles found across US, UK and CA.`, identifiable >= 3 ? "supports" : "neutral");
  add(`${P}f04`, "hackernews", "communitySignal", `Ask HN-style discussion of ${short(kw, 30)} tools`, "Mixed views on existing tools; several replies say current options are good enough.", "I tried two tools and went back to a spreadsheet.", substitutes <= 1 ? "weakens" : "neutral");
  add(`${P}f05`, "g2", "competitor", `${names[0]}: closest competitor at ~$${Math.max(5, Math.round(price * 1.4))}/mo`, `Reviewers like the core workflow but call it generic for ${short(custL, 30)}.`, "Solid, but clearly not built for people like me.", "supports", "high");
  add(`${P}f06`, "producthunt", "competitor", `${names[1]} launched with a similar pitch`, "A recent launch targets an overlapping audience with modest traction.", "Interesting! How is this different from the tool I already use?", "weakens");
  add(`${P}f07`, "crunchbase", "fundingEvent", `Funding check across ${r.int(4, 8)} competitors`, resources >= 3 ? "Most competitors are bootstrapped or small." : resources === 2 ? "One competitor raised a seed round; others are small." : "Several competitors have raised venture rounds.", resources >= 2 ? "Largest disclosed round: seed." : "Median disclosed round: Series A.", resources >= 2 ? "supports" : "weakens");
  add(`${P}f08`, "github", "openSource", `Open-source projects touching ${short(kw, 30)}`, "A few small repositories exist; none is a maintained product.", "Weekend project, not maintained. PRs welcome.", "supports");
  add(`${P}f09`, "builders", "builderCapability", i.buildPath === "aiNoCode" ? "Builder platforms support the core integrations" : "Required APIs and integrations are available", i.buildPath === "aiNoCode" ? "Common AI and no-code builders cover auth, payments and the main integrations; complex logic needs workarounds." : "The APIs the core feature depends on exist and are documented.", "Webhooks and OAuth available on all paid plans.", "supports", "high");
  add(`${P}f10`, "builders", "builderCapability", `Running cost estimate ≈ $${vc.toFixed(2)} per customer per month`, i.runningCost != null ? "Based on the running cost you entered, checked against typical API and hosting pricing." : "No running cost entered; estimated at ~12% of price from typical API and hosting pricing.", "Usage-based pricing; first tier free.", variableCost >= 3 ? "supports" : "weakens", i.runningCost != null ? "high" : "low");
  add(`${P}f11`, "googletrends", "trend", `Search volume for ${short(kw, 30)} terms`, online >= 3 ? "Steady, high-intent searches suggest customers look for help online." : "Modest search volume; customers don't often search for a tool.", "Related queries include how-to and template searches.", online >= 3 ? "supports" : "neutral");
  add(`${P}f13`, "reddit", "communitySignal", `Communities where ${short(custL, 30)} gather`, "Several active communities discuss day-to-day work; some restrict promotion.", "Tool recommendations allowed in the weekly thread only.", accessible >= 3 ? "supports" : "neutral");
  add(`${P}f14`, "g2", "competitor", "Customers already pay for tools in this category", "Reviews and pricing pages show paid adoption of adjacent tools.", "Worth the subscription for the time it saves.", "supports", "high");
  add(`${P}f15`, "indiehackers", "communitySignal", "App marketplaces and partner listings", "Adjacent tools reach customers through marketplaces and integrations.", "Our marketplace listing drives a third of signups.", whiteLabel >= 2 ? "supports" : "neutral");
  add(`${P}f17`, "techcrunch", "fundingEvent", "Incumbents adding similar features", "Larger platforms announced features overlapping this idea.", "The update rolls out to all paid plans this quarter.", "weakens", "medium");
  add(`${P}f18`, "hackernews", "communitySignal", i.regulatory.trim() ? `Discussion of rules around ${short(lower(i.regulatory), 34)}` : "No licensing or compliance blockers surfaced", i.regulatory.trim() ? "Builders describe how they handle the rules you flagged; manageable but needs care." : "No discussions of licensing or data-protection issues specific to this idea.", "Keep consent explicit and store the minimum.", regulatory >= 3 ? "supports" : "neutral");
  add(`${P}f19`, "linkedin", "trend", "Hiring and job-post trends in the segment", "Job posts and profile growth in this segment are stable.", "Roles in this segment: +4% YoY.", "neutral", "low");
  add(`${P}f20`, "producthunt", "competitor", `${names[2]} offers a free tier`, "A free option anchors price expectations for the smallest customers.", "Free for up to 3 projects.", "weakens");
  if (!partialFailure) {
    add(`${P}f12`, "googletrends", "trend", `12-month trend for "${short(kw, 28)}"`, trends >= 3 ? "Interest has risen over the last year." : "Interest is flat over the last year.", trends >= 3 ? "Index up year over year." : "Index roughly flat.", trends >= 3 ? "supports" : "neutral");
    add(`${P}f16`, "statista", "marketStat", `Market size for ${short(custL, 34)}`, "Licensed estimate used for the top-down market size.", "Estimate based on industry reports; directional only.", "supports", "medium");
    add(`${P}f21`, "statista", "marketStat", "Category adoption is rising, not saturated", "Adoption of tools like this is growing in the segment.", "Usage up year over year; most still use manual methods.", "supports", "medium");
  }
  if (i.whyNow.trim()) add(`${P}f22`, "techcrunch", "trend", "Why-now signal matches recent coverage", `Coverage supports the change you described: ${short(lower(i.whyNow), 80)}`, "The shift opened room for smaller, focused tools.", "supports", "medium");
  if (access) add(`${P}f23`, "linkedin", "communitySignal", "Founder has an existing audience or network", "Your intake mentions an audience or network in this space.", "Network reach confirmed from intake.", "supports", "medium");
  if (ip) add(`${P}f24`, "linkedin", "communitySignal", "Founder brings specialist knowledge", "Your background suggests domain expertise competitors may lack.", short(i.skills, 90), "supports", "low");
  if (i.buildPath === "hiredDeveloper") add(`${P}f25`, "builders", "builderCapability", "Typical contractor quotes for an MVP like this", "Freelance MVP quotes for similar scope vary widely; managing scope is the main risk.", "Fixed-price quotes ranged widely for similar specs.", "neutral", "low");
  add(`${P}f26`, "reddit", "communitySignal", "Workarounds people use today", `Common workarounds: ${short(lower(i.currentSolution || "spreadsheets and manual follow-up"), 80)}.`, "It's clunky but free.", "neutral");

  const ex = (id: string) => specs.some((s) => s[0] === `${P}${id}`);
  const ids = (...xs: string[]) => xs.filter(ex).map((x) => `${P}${x}`);

  const c: Record<string, CriterionJudgment> = {
    "cust.identifiable": { base: identifiable, justification: identifiable >= 3 ? `"${short(cust, 50)}" is specific enough to find and count.` : `"${short(cust, 50)}" is broad; narrowing it would help.`, findingIds: ids("f03", "f01") },
    "cust.problem": { base: problemScore, justification: problemScore >= 3 ? `The job and today's workaround (${short(lower(i.currentSolution), 50)}) are clear.` : "Today's workaround isn't described yet.", findingIds: ids("f01", "f26") },
    "cust.frequent": { base: frequent, justification: frequent >= 3 ? "The problem shows up weekly or more." : frequent === 2 ? "Frequency is unclear from the evidence." : "The problem looks infrequent.", findingIds: ids("f01") },
    "cust.sizable": { base: null, justification: "", findingIds: ids("f16", "f03") },
    "cust.accessible": { base: accessible, justification: accessible >= 3 ? "Customers gather in identifiable communities you named." : "No clear gathering place yet.", findingIds: ids("f13") },
    "econ.monetization": { base: monetization, justification: `The customer pays directly; comparable tools price near $${Math.round(price * 1.4)}/mo.`, findingIds: ids("f05", "f14") },
    "econ.devCost": { base: devCost, justification: devNote, findingIds: devCost == null ? [] : ids("f09", ...(i.buildPath === "hiredDeveloper" ? ["f25"] : ["f08"])) },
    "econ.variableCost": { base: variableCost, justification: `~$${vc.toFixed(2)} per customer per month against a $${price} price.`, findingIds: ids("f10", "f09") },
    "econ.margins": { base: null, justification: "", findingIds: ids("f10", "f05") },
    "econ.scale": { base: scale, justification: scale >= 3 ? "The core workflow is automated, so cost per customer should fall." : "Hands-on support features limit economies of scale.", findingIds: ids("f02") },
    "comp.substitutes": { base: substitutes, justification: substitutes >= 2 ? "Substitutes exist but leave clear gaps." : "Many people find existing options good enough.", findingIds: ids("f04", "f05") },
    "comp.defensible": { base: defensible, justification: defensible >= 2 ? "Your background and niche focus give a modest edge." : "No clear defensible angle yet.", findingIds: ids("f06") },
    "comp.leader": { base: leader, justification: leader >= 3 ? "No single player dominates." : "One or two competitors hold early mindshare.", findingIds: ids("f05", "f06") },
    "comp.resources": { base: resources, justification: resources >= 3 ? "Competitors are small or bootstrapped." : resources === 2 ? "Mostly small competitors, one funded." : "Several competitors are venture-funded.", findingIds: ids("f07") },
    "comp.ip": { base: ip, justification: ip ? "Your specialist knowledge is a possible edge; not yet proprietary." : "No proprietary data, integrations or specialist knowledge identified.", findingIds: ip ? ids("f24") : [] },
    "chan.route": { base: route, justification: route >= 3 ? `You named specific channels: ${short(i.distributionIdeas, 60)}.` : "No specific acquisition channel named yet.", findingIds: ids("f13", "f11") },
    "chan.access": { base: access, justification: access ? "You mentioned an existing audience or network." : "The intake didn't describe an existing audience or network.", findingIds: access ? ids("f23") : [] },
    "chan.whiteLabel": { base: whiteLabel, justification: whiteLabel >= 2 ? "Marketplaces and partners are plausible routes." : "Few partner routes found.", findingIds: ids("f15") },
    "chan.online": { base: online, justification: online >= 3 ? "Customers search for and discuss this online." : "Online discussion is modest.", findingIds: ids("f11", "f01") },
    "chan.cac": { base: null, justification: "", findingIds: ids("f11", "f13") },
    "time.trends": partialFailure ? { base: null, justification: "Market Agent returned partial results: no trend data.", findingIds: [] } : { base: trends, justification: trends >= 3 ? "Interest is rising year over year." : "Interest is flat.", findingIds: ids("f12", "f22") },
    "time.infra": { base: infra, justification: i.buildPath === "aiNoCode" ? "Required APIs exist, and the main integrations are available in no-code tools." : "Required APIs and platforms exist today.", findingIds: ids("f09", "f08") },
    "time.educated": partialFailure ? { base: null, justification: "Market Agent returned partial results: no category-adoption data.", findingIds: [] } : { base: educated, justification: "Customers already pay for adjacent tools.", findingIds: ids("f14", "f21") },
    "time.tipping": partialFailure ? { base: null, justification: "Market Agent returned partial results: no adoption-curve data.", findingIds: [] } : { base: tipping, justification: "Adoption is growing, but incumbents are adding similar features.", findingIds: ids("f21", "f17") },
    "time.regulatory": { base: regulatory, justification: regulatory >= 3 ? "No licensing or data-protection blockers found." : regulatory === 2 ? `Manageable rules to plan for: ${short(lower(i.regulatory), 60)}.` : `Serious compliance area: ${short(lower(i.regulatory), 60)}.`, findingIds: ids("f18") },
  };
  // A score of 4 with a single source is capped by the scoring engine; give 4s a second source.
  if (c["econ.variableCost"].base === 4 && c["econ.variableCost"].findingIds.length < 2) c["econ.variableCost"].findingIds.push(`${P}f09`);

  // --- RWW -----------------------------------------------------------------
  const cost6mo = (vc * 40 + 40) * 6 + (i.buildPath === "hiredDeveloper" ? i.buildBudget ?? 0 : 0);
  const resRatio = i.budget > 0 ? i.budget / cost6mo : 0;
  const needed = Math.ceil((i.mrrGoal || 1000) / price);
  const perMonth = needed / Math.max(1, i.timelineMonths || 12);
  const a = (x: RwwAnswer | null, note: string, f: string[] = []): RwwJudgment => ({ base: x, note, findingIds: ids(...f) });
  const skillsAnswer: Record<string, [RwwAnswer | null, string]> = {
    selfCoded: ["yes", "You'll code it yourself; the remaining gap is selling."],
    aiNoCode: ["maybe", "AI/no-code covers the core; complex logic may need workarounds."],
    hiredDeveloper: ["maybe", "Hiring a developer shifts the risk from build skill to managing a contractor and budget."],
    notSure: [null, "Build path not chosen yet."],
  };
  const sk = skillsAnswer[i.buildPath ?? "notSure"];
  const knows: Record<string, [RwwAnswer, string]> = {
    iAmOne: ["yes", "You are one of these customers."],
    workedWith: ["yes", "You've worked with these customers."],
    talkedToFew: ["maybe", "You've talked to a few; more conversations would sharpen this."],
    outsideView: ["no", "Outside view: competitors likely know these customers better today."],
  };
  const kn = knows[i.familiarity ?? "outsideView"];
  const rww: Record<string, RwwJudgment> = {
    "real.need": a(i.currentSolution.trim() ? "yes" : "maybe", i.currentSolution.trim() ? `Today people ${lower(short(i.currentSolution, 70))}.` : "How people solve this today isn't documented yet.", ["f01"]),
    "real.canBuy": a("yes", "The user is likely the buyer at this price.", ["f14"]),
    "real.willBuy": a("maybe", `Free options and "good enough" workarounds make $${price}/mo unproven.`, ["f20", "f04"]),
    "real.feasible": a(i.buildPath === "notSure" ? "maybe" : "yes", "The required technology exists today.", ["f09"]),
    "real.acceptable": a(regulatory >= 3 ? "yes" : "maybe", regulatory >= 3 ? "No norms or rules stand in the way." : `Plan for: ${short(lower(i.regulatory), 60)}.`, ["f18"]),
    "real.barriers": a("maybe", "Customers must change an existing habit to adopt it.", ["f26"]),
    "win.advantage": a(i.familiarity === "outsideView" && substitutes <= 1 ? "no" : "maybe", i.familiarity === "outsideView" && substitutes <= 1 ? "No sustainable advantage yet. Substitutes are good enough and you're new to these customers." : "Your angle is real but could be copied.", ["f06", "f05"]),
    "win.timing": a(i.whyNow.trim() ? "yes" : "maybe", i.whyNow.trim() ? `Why now: ${short(lower(i.whyNow), 70)}.` : "No why-now change identified.", ["f22", "f12"]),
    "win.beat": a(resources >= 2 ? "maybe" : "no", resources >= 2 ? "Competitors are beatable in a niche." : "Funded competitors make head-on competition hard.", ["f07", "f17"]),
    "win.skills": a(sk[0], sk[1]),
    "win.committed": a(i.weeklyHours >= 10 ? "yes" : i.weeklyHours >= 5 ? "maybe" : "no", `${i.weeklyHours} hours a week for ${i.timelineMonths} months.`),
    "win.knows": a(kn[0], kn[1]),
    "worth.money": a(null, "", ["f16", "f03"]),
    "worth.resources": a(resRatio >= 1 ? "yes" : resRatio >= 0.6 ? "maybe" : "no", `A $${i.budget.toLocaleString()} budget against ~$${Math.round(cost6mo).toLocaleString()} for six months of running costs${i.buildPath === "hiredDeveloper" ? " plus the developer" : ""}.`),
    "worth.risks": a("maybe", "Market risk outweighs technical risk; test demand early.", ["f17"]),
    "worth.fit": a(perMonth <= 20 ? "yes" : perMonth <= 60 ? "maybe" : "no", `Reaching $${i.mrrGoal.toLocaleString()} MRR in ${i.timelineMonths} months means ~${Math.ceil(perMonth)} new customers a month.`),
  };

  const findings: Finding[] = linkFindings(buildFindings(specs, now), c, rww);

  // --- market, unit economics, artifacts ----------------------------------
  const obtainable = Math.round((identifiable >= 3 ? r.int(1500, 5000) : r.int(3000, 9000)) / 100) * 100;
  const cac = Math.round(Math.max(20, price * r.int(2, 6) * (accessible >= 3 ? 0.8 : 1.2)));
  const unitName = short(custL, 40);
  const market = {
    topDown: { tam: obtainable * r.int(40, 80), sam: obtainable * r.int(6, 12), som: obtainable, assumptions: [`Industry estimate of ${unitName} (directional).`, "Share that runs the workflow with software today (SAM).", `Share reachable within ${i.timelineMonths} months through your channels (SOM).`] },
    bottomUp: { tam: obtainable * r.int(8, 15), sam: obtainable * r.int(3, 5), som: Math.round((obtainable * (0.9 + r.next() * 0.2)) / 100) * 100, assumptions: ["Identifiable profiles in this segment.", "Share active in communities you can reach.", "Share likely to try a new tool in year one."] },
    obtainableCustomers: obtainable,
    unit: unitName,
  };
  const competitors: Competitor[] = [
    { name: names[0], pricing: `$${Math.max(5, Math.round(price * 1.4))}/mo`, segment: "Broad SMB", strengths: "Mature core workflow", gaps: `Generic for ${short(custL, 28)}`, funding: resources >= 2 ? "Seed" : "Series A" },
    { name: names[1], pricing: `$${Math.max(5, Math.round(price * 0.9))}/mo`, segment: "Overlapping niche", strengths: "Recent launch, focused pitch", gaps: "Few integrations", funding: "Bootstrapped" },
    { name: names[2], pricing: "Free / paid tier", segment: "Smallest customers", strengths: "Free tier", gaps: "Limited features", funding: "Undisclosed" },
    { name: "Manual workaround", pricing: "Free", segment: "Most of the market", strengths: "Familiar, flexible", gaps: "Time-consuming, error-prone", funding: "—" },
  ];
  const channelNames = i.distributionIdeas.split(/[,;\n]| and /).map((s) => s.trim()).filter((s) => s.length > 2).slice(0, 3);
  const channels: Channel[] = [
    ...channelNames.map((n, idx) => ({ id: `ch-${idx}`, name: short(n.charAt(0).toUpperCase() + n.slice(1), 50), fit: Math.max(30, 75 - idx * 8 - r.int(0, 8)), effort: (idx === 0 ? "medium" : r.pick(["low", "medium", "high"])) as Channel["effort"], reason: "You named this channel; evidence shows your customers are active there.", findingIds: ids("f13") })),
    { id: "ch-seo", name: `SEO on ${short(kw, 24)} searches`, fit: online >= 3 ? 64 : 38, effort: "medium" as const, reason: online >= 3 ? "Steady high-intent searches; compounding but slow." : "Search volume is modest.", findingIds: ids("f11") },
    { id: "ch-market", name: "App marketplaces and partners", fit: whiteLabel >= 2 ? 52 : 30, effort: "medium" as const, reason: "Puts the tool where customers already work.", findingIds: ids("f15") },
    { id: "ch-cold", name: "Cold outreach", fit: 26, effort: "high" as const, reason: "Low trust for a small-ticket tool; useful for first interviews.", findingIds: [] },
  ].sort((x, y) => y.fit - x.fit);

  const personas: Persona[] = [
    { id: "p1", name: `The core ${short(custL, 40)}`, who: `${short(cust, 80)} who deals with this weekly.`, where: channelNames[0] ? `${channelNames.join(", ")}; LinkedIn searches for the role.` : "LinkedIn role searches, relevant subreddits and Slack groups.", why: "The primary buyer and user." },
    { id: "p2", name: "The recent switcher", who: `Someone who tried ${names[0]} or a similar tool in the last 6 months.`, where: "Review sites, Product Hunt comments, community threads about tools.", why: "Shows what makes existing options fail." },
    { id: "p3", name: "The workaround loyalist", who: `Someone who still ${lower(short(i.currentSolution || "does it manually", 60))}.`, where: "Community threads, your own network.", why: "Tests whether the problem is painful enough to switch." },
  ];

  const draft: Analysis = {
    generatedAt: now,
    criteria: c,
    rww,
    findings,
    filterNotes: {
      customer: { rationale: `${identifiable >= 3 ? "A nameable segment" : "A broad segment"} with ${frequent >= 3 ? "a frequent problem" : "a problem of unclear frequency"}. ${accessible >= 3 ? "Customers gather where you can reach them." : "Where they gather is still unclear."}`, biggestRisk: identifiable >= 3 ? "Confirming they'll pay, not just agree it's annoying." : "A segment too broad to design or market for." },
      economic: { rationale: `At $${price}/mo with ~$${vc.toFixed(2)} running cost per customer, margins are ${variableCost >= 3 ? "healthy" : "thin"}. ${devNote}`, biggestRisk: variableCost >= 3 ? "Price is unvalidated." : "Running costs could outgrow the price." },
      competition: { rationale: `${names[0]} and ${names[1]} overlap, and free workarounds set a low bar. ${resources >= 2 ? "Competitors are mostly small." : "Several competitors are funded."}`, biggestRisk: "Incumbents adding the same feature." },
      channel: { rationale: `${route >= 3 ? "You've named specific channels." : "No primary channel yet."} Estimated CAC is ~$${cac}.`, biggestRisk: access ? "Channel costs at scale." : "No existing audience to launch to." },
      timing: { rationale: partialFailure ? "Infrastructure exists, but the Market Agent returned partial results, so trend and adoption data are missing." : `Infrastructure exists and ${trends >= 3 ? "interest is rising" : "interest is flat"}.`, biggestRisk: partialFailure ? "Not enough timing evidence to judge." : "A crowded window as incumbents move in." },
    },
    competitors,
    market,
    trend: { term: kw, points: partialFailure ? [] : trendSeries(r.int(35, 70), Array.from({ length: 12 }, () => (trends >= 3 ? r.int(-1, 3) : r.int(-2, 2)))) },
    painPoints: [
      { theme: "Time lost to the workaround", mentions: r.int(15, 40), quotes: [{ text: "It works, barely. It eats my evenings.", sourceId: "reddit" }] },
      { theme: "Existing tools feel generic", mentions: r.int(8, 25), quotes: [{ text: "Solid, but clearly not built for people like me.", sourceId: "g2" }] },
      { theme: "Price sensitivity", mentions: r.int(5, 18), quotes: [{ text: "They'll pay if it saves real time every week.", sourceId: "indiehackers" }] },
    ],
    unit: { cac, variableCost: vc, supportHoursPerCustomer: scale >= 3 ? 0.15 : 0.5, buildCost: i.buildPath === "hiredDeveloper" ? i.buildBudget : null },
    channels,
    alternatives: [],
    personas,
    partialFailure,
  };
  draft.alternatives = buildAlternatives(i, draft);
  return draft;
}

function buildAlternatives(i: IntakeInput, analysis: Analysis): AlternativeDirection[] {
  const report = computeReport({ idea: { id: "tmp", intake: i, analysis, findingState: {}, adjustments: { criteria: {}, rww: {} } }, weights: { ...SCORING_CONFIG.defaultWeights } });
  const cur = Object.fromEntries(FILTER_IDS.map((f) => [f, report?.filters.find((x) => x.id === f)?.score ?? 50])) as Record<FilterId, number>;
  const bump = (d: Partial<Record<FilterId, number>>) => Object.fromEntries(FILTER_IDS.map((f) => [f, Math.max(0, Math.min(100, cur[f] + (d[f] ?? 0)))])) as Record<FilterId, number>;
  const cust = short(lower(i.targetCustomer || "customers"), 50);
  return [
    { id: "alt-niche", name: `${i.name} for one specific sub-niche`, oneLiner: `Narrow from "${cust}" to the single sub-segment with the sharpest pain.`, why: "A narrower segment is easier to find, talk to, and beat generic tools for.", improves: "Customer → identifiable, Competition, Win", profile: bump({ customer: 8, competition: 12, channel: 6, economic: -4 }), intakePatch: { name: `${i.name} (niche)`, targetCustomer: `One sub-segment of ${cust}` } },
    { id: "alt-teams", name: `${i.name} for small teams`, oneLiner: "Sell to 2–10 person teams at a higher price.", why: "Fewer customers needed for the same MRR, and teams feel the pain across people.", improves: "Economic filter and Worth It", profile: bump({ economic: 10, customer: -6, channel: -4 }), intakePatch: { name: `${i.name} for small teams`, price: Math.round((i.price || 10) * 3) } },
    { id: "alt-addon", name: `${i.name} as an add-on to existing tools`, oneLiner: "Ship inside a marketplace your customers already use.", why: "Borrowed distribution beats starting from zero.", improves: "Channel filter (white label route)", profile: bump({ channel: 14, competition: -4 }), intakePatch: { name: `${i.name} add-on`, solution: `An add-on for tools ${cust} already use. ${i.solution}` } },
  ];
}

