/**
 * Chat service. Async, typed; reads/writes local storage today, an API later.
 * `replyTo` is a stand-in for the model: it answers from the ideas and research already in the
 * workspace with simple keyword matching. Swap it for a streaming endpoint without touching components.
 */
import { FILTER_SHORT, soloReadingFor } from "@/config/criteria";
import { BAND_ORDER, BAND_SHORT } from "@/config/scoring";
import { delay, money, uid } from "@/lib/utils";
import { computeReport } from "./scoring";
import { mutateDb, readDb } from "./storage";
import type { ChatAction, ChatMessage, ChatReference, ChatThread, Finding, Idea, Report } from "@/types";

const titleFrom = (text: string) => {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > 56 ? `${t.slice(0, 53).trimEnd()}…` : t || "New chat";
};

export async function getChat(id: string): Promise<ChatThread | null> {
  await delay(80);
  return readDb().chats.find((c) => c.id === id) ?? null;
}

/** Starts a thread with the user's first message. Call `replyTo` next for the answer. */
export async function startChat(text: string, focusIdeaId: string | null = null): Promise<ChatThread> {
  await delay(120);
  const now = new Date().toISOString();
  const chat: ChatThread = {
    id: uid("chat"),
    title: titleFrom(text),
    createdAt: now,
    updatedAt: now,
    focusIdeaId,
    messages: [{ id: uid("m"), role: "user", content: text.trim(), createdAt: now }],
  };
  mutateDb((db) => {
    db.chats.unshift(chat);
  });
  return chat;
}

function updateChat(id: string, fn: (chat: ChatThread) => void): ChatThread {
  let out: ChatThread | null = null;
  mutateDb((db) => {
    const chat = db.chats.find((c) => c.id === id);
    if (!chat) throw new Error("Chat not found");
    fn(chat);
    chat.updatedAt = new Date().toISOString();
    out = chat;
  });
  return out!;
}

export async function addUserMessage(id: string, text: string): Promise<ChatThread> {
  await delay(60);
  return updateChat(id, (c) => c.messages.push({ id: uid("m"), role: "user", content: text.trim(), createdAt: new Date().toISOString() }));
}

export async function setChatFocus(id: string, focusIdeaId: string | null): Promise<ChatThread> {
  await delay(40);
  return updateChat(id, (c) => {
    c.focusIdeaId = focusIdeaId;
  });
}

export async function renameChat(id: string, title: string): Promise<ChatThread> {
  await delay(60);
  return updateChat(id, (c) => {
    c.title = titleFrom(title);
  });
}

export async function deleteChat(id: string): Promise<void> {
  await delay(100);
  mutateDb((db) => {
    db.chats = db.chats.filter((c) => c.id !== id);
  });
}

/** Generates the assistant's answer to the latest user message and appends it. */
export async function replyTo(id: string): Promise<ChatThread> {
  const db = readDb();
  const chat = db.chats.find((c) => c.id === id);
  if (!chat) throw new Error("Chat not found");
  const last = [...chat.messages].reverse().find((m) => m.role === "user");
  const reply = compose(last?.content ?? "", chat, db.ideas, db.settings.weights);
  await delay(900 + Math.min(reply.content.length, 900));
  return updateChat(id, (c) => c.messages.push({ id: uid("m"), role: "assistant", createdAt: new Date().toISOString(), ...reply }));
}

// ---------- Mock responder ----------

type Reply = Pick<ChatMessage, "content" | "references" | "actions">;
type Scored = { idea: Idea; report: Report };

const STOP = new Set(
  "a an and are about any app as at be but by can could do does for from get got has have how i if in into is it its just like make me my of on or our so that the their them then there they this to tool want was we what when where which who why will with would you your build building idea ideas thinking think something some help".split(" "),
);

const words = (text: string) => text.toLowerCase().match(/[a-z][a-z'-]{2,}/g)?.filter((w) => !STOP.has(w)) ?? [];

function scoredIdeas(ideas: Idea[], weights: Report["weights"]): Scored[] {
  return ideas
    .filter((i) => i.status === "complete" && i.analysis)
    .flatMap((idea) => {
      const report = computeReport({ idea, weights, buildReading: (d) => soloReadingFor(d, idea.intake.buildPath) });
      return report ? [{ idea, report }] : [];
    })
    .sort((a, b) => BAND_ORDER[b.report.score.band] - BAND_ORDER[a.report.score.band] || b.report.score.overall - a.report.score.overall);
}

function mentionedIdea(text: string, pool: Scored[]): Scored | null {
  const t = text.toLowerCase();
  return pool.find(({ idea }) => idea.intake.name && t.includes(idea.intake.name.toLowerCase())) ?? null;
}

/** Findings across the workspace that share the most words with the prompt. */
function relatedFindings(text: string, pool: Scored[], limit = 3): { idea: Idea; finding: Finding }[] {
  const q = new Set(words(text));
  if (q.size === 0) return [];
  return pool
    .flatMap(({ idea }) =>
      (idea.analysis?.findings ?? [])
        .filter((f) => !idea.findingState[f.id]?.hidden)
        .map((finding) => ({ idea, finding, hits: words(`${finding.title} ${finding.summary}`).filter((w) => q.has(w)).length })),
    )
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, limit);
}

const ideaRef = (idea: Idea): ChatReference => ({ kind: "idea", ideaId: idea.id, label: idea.intake.name });
const findingRef = (idea: Idea, f: Finding): ChatReference => ({ kind: "finding", ideaId: idea.id, findingId: f.id, label: f.title });
const tab = (idea: Idea, t: string): string => `/app/ideas/${idea.id}?tab=${t}`;
/** Plain-language read of the band. Deliberately says nothing about how the score is built. */
const OUTLOOK: Record<Report["score"]["band"], string> = {
  strong: "It's in good shape overall and worth pursuing.",
  promising: "There's something here, but a few open questions are holding it back.",
  weak: "Right now the evidence doesn't support pursuing it as it stands.",
};

const verdict = ({ report }: Scored) => `**${report.score.overall}**, ${BAND_SHORT[report.score.band].toLowerCase()}`;

function weakest(report: Report, n = 2) {
  return report.filters
    .filter((f) => f.score !== null)
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
    .slice(0, n);
}

function ideaSummary(s: Scored): Reply {
  const { idea, report } = s;
  const strong = [...report.filters].filter((f) => f.score !== null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
  const findings = (idea.analysis?.findings ?? []).filter((f) => f.sentiment !== "neutral" && !idea.findingState[f.id]?.hidden).slice(0, 2);
  const lines = [
    `**${idea.intake.name}** sits at ${verdict(s)}. ${OUTLOOK[report.score.band]}`,
    "",
    strong ? `- Strongest area: **${FILTER_SHORT[strong.id]}**. ${strong.rationale}` : "",
    ...weakest(report).map((f) => `- Holding it back: **${FILTER_SHORT[f.id]}**. ${f.biggestRisk}`),
    "",
    "Want me to dig into competitors, pricing, or what to test first?",
  ].filter((l, i, a) => l !== "" || a[i - 1] !== "");
  return {
    content: lines.join("\n"),
    references: [ideaRef(idea), ...findings.map((f) => findingRef(idea, f))],
    actions: [
      { label: "Open report", href: `/app/ideas/${idea.id}` },
      { label: "See next steps", href: tab(idea, "next") },
    ],
  };
}

function competitorsFor(s: Scored): Reply {
  const { idea } = s;
  const comps = idea.analysis?.competitors ?? [];
  if (comps.length === 0) return { content: `I don't have competitor research for **${idea.intake.name}** yet. Re-running the analysis will pull it in.`, references: [ideaRef(idea)] };
  return {
    content: [
      `Here's who **${idea.intake.name}** is up against:`,
      "",
      ...comps.slice(0, 4).map((c) => `- **${c.name}** (${c.pricing}). Gap: ${c.gaps.charAt(0).toLowerCase()}${c.gaps.slice(1)}.`),
      "",
      "The gaps are where a solo product usually wins: pick one and make it the whole pitch.",
    ].join("\n"),
    references: [ideaRef(idea), ...(idea.analysis?.findings ?? []).filter((f) => f.type === "competitor").slice(0, 2).map((f) => findingRef(idea, f))],
    actions: [{ label: "Review the evidence", href: tab(idea, "sources") }],
  };
}

function pricingFor(s: Scored): Reply {
  const { idea, report } = s;
  const p = report.pathToMrr;
  const reach =
    p.obtainable === null
      ? "I don't have a solid estimate of how many customers you can reach in that window yet."
      : `The research suggests roughly **${p.obtainable.toLocaleString("en-US")}** reachable customers in that window, so the goal ${p.obtainable >= p.customersNeeded ? "looks within reach" : "looks like a stretch at this price"}.`;
  return {
    content: [
      `At **${money(p.price)}/mo**, **${idea.intake.name}** needs about **${p.customersNeeded.toLocaleString("en-US")}** paying customers to hit ${money(p.mrrGoal)} MRR in ${idea.intake.timelineMonths} months.`,
      "",
      [reach, p.cacPaybackMonths !== null ? `Each customer pays back what it costs to win them in about **${p.cacPaybackMonths.toFixed(1)} months**.` : ""].filter(Boolean).join(" "),
      "",
      "Try a different price on the MRR tab and the score updates as you go.",
    ]
      .filter((l, i, a) => l !== "" || a[i - 1] !== "")
      .join("\n"),
    references: [ideaRef(idea)],
    actions: [{ label: "Pressure-test pricing", href: tab(idea, "mrr") }],
  };
}

function compare(pool: Scored[]): Reply {
  if (pool.length < 2) return { content: "You need at least two analyzed ideas to compare. Validate another one and I'll line them up." , actions: [{ label: "Validate a new idea", href: "/app/ideas/new" }] };
  const [top] = pool;
  return {
    content: [
      "Here's how your analyzed ideas stack up:",
      "",
      ...pool.map((s, i) => `${i + 1}. **${s.idea.intake.name}**: ${verdict(s)}`),
      "",
      `**${top.idea.intake.name}** leads. ${OUTLOOK[top.report.score.band]}`,
    ].join("\n"),
    references: pool.map(({ idea }) => ideaRef(idea)),
    actions: [{ label: "Compare side by side", href: "/app/ideas" }],
  };
}

function pitch(text: string, pool: Scored[]): Reply {
  const related = relatedFindings(text, pool);
  const comps = pool
    .flatMap(({ idea }) => (idea.analysis?.competitors ?? []).map((c) => ({ idea, c })))
    .filter(({ c }) => words(`${c.segment} ${c.strengths} ${c.gaps}`).some((w) => words(text).includes(w)))
    .slice(0, 2);
  const lines = ["That's worth a look. A few things I'd want to pin down before anything else:", "", "- **Who feels this most?** One specific role or situation, not a broad market.", "- **What do they do today?** The current workaround is your real competitor.", "- **What would they pay?** A rough monthly price lets me size the path to revenue."];
  if (related.length > 0) {
    lines.push("", "Some research from your other ideas looks relevant:", "", ...related.map(({ idea, finding }) => `- ${finding.summary} *(from ${idea.intake.name})*`));
  }
  if (comps.length > 0) {
    lines.push("", `Watch for overlap with ${comps.map(({ c }) => `**${c.name}**`).join(" and ")}, which came up in earlier research.`);
  }
  lines.push("", "When you're ready, I can turn this into a full validation run with market, competitor and community research.");
  const actions: ChatAction[] = [
    { label: "Validate this idea", href: `/app/ideas/new?idea=${encodeURIComponent(text.trim())}` },
  ];
  return { content: lines.join("\n"), references: related.map(({ idea, finding }) => findingRef(idea, finding)), actions };
}

function overview(pool: Scored[], ideas: Idea[]): Reply {
  if (pool.length === 0) {
    return {
      content: "You don't have any analyzed ideas yet, so I'm working from a blank slate. Tell me what you're thinking of building and I'll help you shape it.",
      actions: [{ label: "Validate a new idea", href: "/app/ideas/new" }],
    };
  }
  const drafts = ideas.filter((i) => i.status === "draft").length;
  const findings = pool.reduce((n, s) => n + (s.idea.analysis?.findings.length ?? 0), 0);
  return {
    content: [
      `I can see **${pool.length}** analyzed idea${pool.length === 1 ? "" : "s"}${drafts ? ` and ${drafts} draft${drafts === 1 ? "" : "s"}` : ""}, backed by ${findings} findings.`,
      "",
      ...pool.slice(0, 3).map((s) => `- **${s.idea.intake.name}**: ${verdict(s)}`),
      "",
      "Ask me about any of them, compare them, or pitch something new.",
    ].join("\n"),
    references: pool.slice(0, 3).map(({ idea }) => ideaRef(idea)),
  };
}

function compose(text: string, chat: ChatThread, ideas: Idea[], weights: Report["weights"]): Reply {
  const pool = scoredIdeas(ideas, weights);
  const t = text.toLowerCase();
  const target = mentionedIdea(text, pool) ?? pool.find((s) => s.idea.id === chat.focusIdeaId) ?? null;

  if (/\b(compare|rank|best|strongest|which (one|idea))\b/.test(t)) return compare(pool);
  if (target && /\b(competitors?|competition|alternatives?|rivals?|versus|vs)\b/.test(t)) return competitorsFor(target);
  if (target && /\b(price|pricing|mrr|revenue|charge|customers? needed)\b/.test(t)) return pricingFor(target);
  if (target && (mentionedIdea(text, pool) || /\b(how|doing|score|summar|risk|next|weak|strong)\w*/.test(t))) return ideaSummary(target);
  if (/\b(what about|i want to|i'm thinking|im thinking|idea for|an? (app|tool|platform|service|marketplace|saas)|build(ing)?|for (freelancers|teams|students|founders|small))\b/.test(t) || words(text).length >= 5)
    return pitch(text, pool);
  return overview(pool, ideas);
}
