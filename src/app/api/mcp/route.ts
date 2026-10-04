import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { CRITERION_BY_ID } from "@/config/criteria";
import { getSource } from "@/config/sources";
import { getIdeaRow, getProfile, listIdeaRows } from "@/server/db";
import { serverReport } from "@/server/report";
import { supabaseAdmin } from "@/server/supabase/admin";
import { hashToken, looksLikeToken } from "@/server/tokens";
import { EMPTY_QUERY, queryFindings } from "@/services/sources";
import type { Idea } from "@/types";

/**
 * Read-only MCP server so AI tools (Cursor, Claude, ChatGPT…) can read a Desy workspace.
 * Auth: `Authorization: Bearer desy_…`, a personal access token created in Settings → Integrations.
 * Queries use the service role, so every one filters by the user id the token resolved to.
 */

export const runtime = "nodejs";

type Ctx = { http?: { authInfo?: { clientId: string } } };

function userIdFrom(ctx: Ctx): string {
  const id = ctx.http?.authInfo?.clientId;
  if (!id) throw new Error("Not authorized");
  return id;
}

const json = (value: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] });

async function loadIdea(userId: string, ideaId: string): Promise<Idea> {
  const row = await getIdeaRow(supabaseAdmin(), userId, ideaId);
  if (!row) throw new Error(`No idea with id ${ideaId}`);
  return row.idea;
}

async function weightsFor(userId: string) {
  const { data } = await supabaseAdmin().auth.admin.getUserById(userId);
  if (!data.user) throw new Error("Account not found");
  return (await getProfile(supabaseAdmin(), data.user)).settings.weights;
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "list_ideas",
      {
        title: "List ideas",
        description: "List the SaaS ideas in this Desy workspace with their status, Desy Score and pursuit band.",
        inputSchema: z.object({}),
      },
      async (_args: Record<string, never>, ctx: Ctx) => {
        const userId = userIdFrom(ctx);
        const [ideas, weights] = await Promise.all([listIdeaRows(supabaseAdmin(), userId), weightsFor(userId)]);
        return json(
          ideas.map((idea) => {
            const report = serverReport(idea, weights);
            return {
              id: idea.id,
              name: idea.intake.name || "Untitled draft",
              oneLiner: idea.intake.oneLiner,
              status: idea.status,
              score: report?.score.overall ?? null,
              band: report?.score.band ?? null,
              updatedAt: idea.updatedAt,
            };
          }),
        );
      },
    );

    server.registerTool(
      "get_idea_report",
      {
        title: "Get idea report",
        description: "The founder's inputs and the full scored report for one idea: score, band, confidence, area scores with reasons and risks, path to MRR, competitors and distribution channels.",
        inputSchema: z.object({ ideaId: z.string().describe("Idea id from list_ideas") }),
      },
      async ({ ideaId }: { ideaId: string }, ctx: Ctx) => {
        const userId = userIdFrom(ctx);
        const [idea, weights] = await Promise.all([loadIdea(userId, ideaId), weightsFor(userId)]);
        const report = serverReport(idea, weights);
        return json({
          id: idea.id,
          intake: idea.intake,
          status: idea.status,
          lastRunAt: idea.lastRunAt,
          report: report && {
            score: report.score,
            areas: report.filters.map((f) => ({
              id: f.id,
              score: f.score,
              confidence: f.confidence,
              rationale: f.rationale,
              biggestRisk: f.biggestRisk,
              criteria: f.criteria.map((c) => ({ id: c.id, label: c.label, score: c.score, justification: c.justification })),
            })),
            pillars: report.pillars.map((p) => ({ id: p.id, net: p.net, questions: p.questions.map((q) => ({ text: q.text, answer: q.answer, note: q.note })) })),
            pathToMrr: report.pathToMrr,
          },
          competitors: idea.analysis?.competitors ?? [],
          channels: idea.analysis?.channels ?? [],
          alternatives: idea.analysis?.alternatives.map((a) => ({ name: a.name, oneLiner: a.oneLiner, why: a.why, improves: a.improves })) ?? [],
        });
      },
    );

    server.registerTool(
      "search_findings",
      {
        title: "Search findings",
        description: "Search the research findings (competitors, market stats, community quotes, trends, interviews) behind one idea. Hidden findings are excluded.",
        inputSchema: z.object({
          ideaId: z.string().describe("Idea id from list_ideas"),
          query: z.string().optional().describe("Words to match in the title, summary, excerpt, source or note"),
          limit: z.number().int().min(1).max(50).optional(),
        }),
      },
      async ({ ideaId, query, limit }: { ideaId: string; query?: string; limit?: number }, ctx: Ctx) => {
        const idea = await loadIdea(userIdFrom(ctx), ideaId);
        const findings = queryFindings(idea.analysis?.findings ?? [], idea.findingState, { ...EMPTY_QUERY, search: query ?? "" });
        return json(
          findings.slice(0, limit ?? 20).map((f) => ({
            id: f.id,
            title: f.title,
            summary: f.summary,
            excerpt: f.excerpt,
            source: getSource(f.sourceId).name,
            url: f.url,
            type: f.type,
            sentiment: f.sentiment,
            confidence: f.confidence,
            areas: f.criterionIds.map((c) => CRITERION_BY_ID[c]?.label ?? c),
            note: idea.findingState[f.id]?.note || undefined,
            pinned: idea.findingState[f.id]?.pinned || undefined,
          })),
        );
      },
    );

    server.registerTool(
      "get_research_plan",
      {
        title: "Get research plan",
        description: "The customer-discovery or pitch plan for one idea: personas, screener, interview script, outreach message, pitch, objections, interview notes and synthesis.",
        inputSchema: z.object({ ideaId: z.string().describe("Idea id from list_ideas") }),
      },
      async ({ ideaId }: { ideaId: string }, ctx: Ctx) => {
        const idea = await loadIdea(userIdFrom(ctx), ideaId);
        return json(idea.plan ?? { message: "No research plan yet. Create one from the idea's Research Planner." });
      },
    );
  },
  { serverInfo: { name: "desy", version: "1.0.0" } },
);

async function verifyToken(_req: Request, bearer?: string) {
  if (!looksLikeToken(bearer)) return undefined;
  const admin = supabaseAdmin();
  const { data } = await admin.from("mcp_tokens").select("id,user_id").eq("token_hash", hashToken(bearer)).is("revoked_at", null).maybeSingle();
  if (!data) return undefined;
  // Best effort; a failed timestamp update shouldn't fail the request.
  void admin.from("mcp_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", data.id).then(() => undefined);
  return { token: bearer, clientId: data.user_id as string, scopes: ["read"] };
}

const authed = withMcpAuth(handler, verifyToken, { required: true });

export { authed as GET, authed as POST, authed as DELETE };
