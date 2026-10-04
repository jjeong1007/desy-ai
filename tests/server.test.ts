import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { EMPTY_INTAKE } from "@/config/intake";
import { invoiceIdea } from "@/mock/seeds";
import { ideaToRow, mutateIdea } from "@/server/db";
import { intakeSchema, parse, planSchema } from "@/server/schemas";
import { hashToken, looksLikeToken, newToken, tokenPrefix } from "@/server/tokens";
import type { Idea } from "@/types";
import { FakeSupabase } from "./support/fake-supabase";

const USER = "00000000-0000-0000-0000-000000000001";
const fake = new FakeSupabase();
const sb = fake as unknown as SupabaseClient;
const user = { id: USER, email: "founder@example.com", user_metadata: {}, last_sign_in_at: "2026-10-01T00:00:00.000Z" } as unknown as User;

vi.mock("@/server/supabase/server", () => ({
  requireUser: async () => ({ sb, user }),
  AuthError: class extends Error {},
}));

function seed(idea: Idea, extra: Partial<Idea> = {}) {
  fake.tables.ideas.push({ ...ideaToRow({ ...structuredClone(idea), ...extra }), user_id: USER, version: 0 });
}

beforeEach(() => {
  fake.tables = { ideas: [], profiles: [{ id: USER, name: "Founder", role: "Solo founder", settings: {} }], chats: [], chat_messages: [], mcp_tokens: [] };
  fake.beforeUpdate = null;
});

describe("tokens", () => {
  it("creates distinct tokens and hashes them deterministically", () => {
    const a = newToken();
    const b = newToken();
    expect(a).not.toBe(b);
    expect(looksLikeToken(a)).toBe(true);
    expect(hashToken(a)).toBe(hashToken(a));
    expect(hashToken(a)).not.toBe(hashToken(b));
    expect(hashToken(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenPrefix(a)).toBe(`${a.slice(0, 9)}…`);
  });
  it("rejects values that aren't Desy tokens", () => {
    expect(looksLikeToken(undefined)).toBe(false);
    expect(looksLikeToken("Bearer abc")).toBe(false);
    expect(looksLikeToken("desy_short")).toBe(false);
  });
});

describe("input schemas", () => {
  it("accepts a blank intake and rejects bad values", () => {
    expect(parse(intakeSchema, EMPTY_INTAKE)).toEqual(EMPTY_INTAKE);
    expect(() => parse(intakeSchema, { ...EMPTY_INTAKE, price: -1 })).toThrow(/Invalid input/);
    expect(() => parse(intakeSchema, { ...EMPTY_INTAKE, buildPath: "magic" })).toThrow(/Invalid input/);
  });
  it("rejects oversized plans", () => {
    const plan = { goal: "discovery", generatedAt: "x", targets: [], personas: [], screener: [], script: [], outreach: "", pitch: [], objections: [], notes: [{ text: "x".repeat(600_000) }], synthesis: null };
    expect(() => parse(planSchema, plan)).toThrow(/too large/);
  });
});

describe("mutateIdea", () => {
  it("bumps the version and records history once", async () => {
    seed(invoiceIdea);
    const out = await mutateIdea(sb, USER, invoiceIdea.id, (i) => {
      i.intake.price = 42;
      return { kind: "edited", summary: "Price changed" };
    });
    expect(out.intake.price).toBe(42);
    expect(out.history[0].summary).toBe("Price changed");
    expect(fake.tables.ideas[0].version).toBe(1);
  });

  it("re-applies the change when another write lands first", async () => {
    seed(invoiceIdea);
    let raced = false;
    fake.beforeUpdate = () => {
      if (raced) return;
      raced = true;
      const row = fake.tables.ideas[0];
      row.version = (row.version as number) + 1;
      (row.intake as Idea["intake"]).name = "Renamed elsewhere";
    };
    let calls = 0;
    const out = await mutateIdea(sb, USER, invoiceIdea.id, (i) => {
      calls++;
      i.intake.price = 42;
    });
    expect(calls).toBe(2);
    expect(out.intake.name).toBe("Renamed elsewhere");
    expect(out.intake.price).toBe(42);
  });

  it("throws for an idea that doesn't exist", async () => {
    await expect(mutateIdea(sb, USER, "nope", () => {})).rejects.toThrow(/not found/);
  });
});

describe("analysis actions", () => {
  it("completeAnalysis is idempotent", async () => {
    const { startAnalysis, completeAnalysis } = await import("@/server/actions/analysis");
    seed(invoiceIdea);
    const started = await startAnalysis(invoiceIdea.id);
    expect(started.status).toBe("running");
    expect(started.run?.agents.length).toBeGreaterThan(0);

    const done = await completeAnalysis(invoiceIdea.id);
    const again = await completeAnalysis(invoiceIdea.id);
    expect(done.status).toBe("complete");
    expect(done.run).toBeNull();
    expect(again.history.filter((h) => h.kind === "run").length).toBe(done.history.filter((h) => h.kind === "run").length);
    expect(done.history[0].scoreAfter).toBeTypeOf("number");
  });
});

describe("finding state", () => {
  it("records a hide with scores computed on the server", async () => {
    const { setFindingState } = await import("@/server/actions/ideas");
    seed(invoiceIdea);
    const f = invoiceIdea.analysis!.findings[0];
    const out = await setFindingState(invoiceIdea.id, f.id, { hidden: true }, { kind: "hidden", text: `Hid finding: ${f.title}` });
    expect(out.findingState[f.id].hidden).toBe(true);
    expect(out.history[0].kind).toBe("hidden");
    expect(out.history[0].scoreBefore).toBeTypeOf("number");
    expect(out.history[0].scoreAfter).toBeTypeOf("number");
  });
});

describe("planner actions", () => {
  it("savePlan keeps the server's notes", async () => {
    const { createPlan, saveNote, savePlan } = await import("@/server/actions/planner");
    seed(invoiceIdea, { plan: null });
    const withPlan = await createPlan(invoiceIdea.id, "discovery");
    const stale = structuredClone(withPlan.plan!);
    await saveNote(invoiceIdea.id, { id: "n1", interviewee: "Maya", personaId: "p1", date: "2026-10-01", text: "Hates it" });
    stale.outreach = "Edited outreach";
    const saved = await savePlan(invoiceIdea.id, stale);
    expect(saved.plan?.outreach).toBe("Edited outreach");
    expect(saved.plan?.notes.map((n) => n.id)).toEqual(["n1"]);
  });
});

describe("new founder flow from an empty account", () => {
  it("drafts, runs, completes, plans and chats without sample data", async () => {
    const { saveDraft, listIdeas } = await import("@/server/actions/ideas");
    const { startAnalysis, completeAnalysis } = await import("@/server/actions/analysis");
    const { createPlan } = await import("@/server/actions/planner");
    const { startChat, replyTo } = await import("@/server/actions/chat");
    expect(await listIdeas()).toEqual([]);

    const draft = await saveDraft(null, { ...EMPTY_INTAKE, name: "Booking reminders for dog groomers", oneLiner: "Cut no-shows for solo groomers.", problem: "Groomers lose money every week to no-shows.", targetCustomer: "Independent mobile dog groomers in the US", currentSolution: "Manual texts the night before", solution: "Automatic SMS reminders with one-tap rescheduling.", keyFeatures: "SMS reminders, rescheduling links", price: 19, mrrGoal: 3000, distributionIdeas: "Groomer Facebook groups" }, 5);
    expect(draft.status).toBe("draft");
    expect(draft.seed).toBeUndefined();

    const running = await startAnalysis(draft.id);
    expect(running.status).toBe("running");
    expect(running.analysis?.findings.length).toBeGreaterThan(0);
    expect(running.analysis?.partialFailure).toBeNull();

    const done = await completeAnalysis(draft.id);
    expect(done.status).toBe("complete");
    expect(done.history[0].scoreAfter).toBeTypeOf("number");

    const planned = await createPlan(draft.id, "discovery");
    expect(planned.plan?.script.length).toBeGreaterThan(0);

    const chat = await startChat("How is the dog groomer idea doing?", draft.id);
    const replied = await replyTo(chat.id);
    expect(replied.messages.at(-1)?.role).toBe("assistant");
    expect(replied.messages.at(-1)?.content).toContain("Booking reminders for dog groomers");
  });
});
