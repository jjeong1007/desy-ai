# Desy backend: implementation plan (non-LLM pass)

## Context

Desy is currently a frontend-only demo. Every screen calls async functions in `src/services/*`. Those functions read and write one `localStorage` blob (`src/services/storage.ts`, key `desy:v1`). Sign-in accepts any credentials. The README says the service layer was built to be swapped for an API without rewriting the screens.

This pass adds a real backend: **Supabase auth**, **Supabase Postgres persistence** with row-level security, server-side business logic, an **MCP server** so AI tools can read a workspace, and account export and deletion. **All LLM work is out of scope.** The research generator, chat replies, planner and synthesis keep their current deterministic template logic, moved to the server. The "Deferred: LLM work" section below records the plan for a later pass. Stripe billing is also out of scope.

## Guiding principles

1. **Keep the shapes in `src/types/index.ts`.** The API returns the same `Idea`, `ChatThread` and `Settings` objects, so components barely change.
2. **Scoring stays deterministic and shared.** `src/services/scoring.ts` runs unchanged on client and server.
3. **Pure helpers stay client-side**, for instant previews: `queryFindings`, `usedIn`, `previewHide` (`src/services/sources.ts`), `previewSynthesis` and `synthesisAdjustments` (`src/services/planner.ts`). The server re-runs them to decide what gets saved and recorded in history.
4. **Service function signatures stay the same where possible.** Their bodies call server actions instead of `mutateDb`. Closure-based `updateIdea(id, fn)` turns into explicit operations. The only external caller is `src/components/settings/account.tsx:108`.
5. **Built so the LLM can be swapped in later.** Template logic sits behind server-side functions (`src/server/engine/*`) with the same inputs and outputs a real agent would use. Nothing on the client depends on it being a template.
6. **Keep methodology vague in user-facing copy.** No rubric, thresholds, weights or framework sources.

## Architecture

```
Browser (existing components + Zustand cache)
  └─ src/services/*  → server actions (src/server/actions/*) / route handlers (src/app/api/*)
        └─ src/server/db/*      (Supabase server client, RLS as the user)
        └─ src/server/engine/*  (generator, chat replies, planner, synthesis: templates now, LLM later)
Supabase: auth.users + public.* tables
MCP: src/app/api/mcp/[transport]/route.ts (personal access tokens)
```

**New dependencies:** `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `mcp-handler`, `@modelcontextprotocol/sdk`, plus the `supabase` CLI as a dev dependency for migrations and type generation.

**Env vars (add `.env.example`):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only: account deletion and MCP token lookup).

## Data model (`supabase/migrations/`)

Ideas keep their nested parts as `jsonb` that matches the TS types, because the client always loads an idea whole. Chats get real rows.

| Table | Columns (key ones) |
| --- | --- |
| `profiles` | `id uuid pk → auth.users`, `name`, `role`, `settings jsonb`, `seeded_at`, `created_at` |
| `ideas` | `id`, `user_id`, `status`, `intake jsonb`, `draft_step`, `analysis jsonb`, `finding_state jsonb`, `adjustments jsonb`, `run jsonb`, `plan jsonb`, `history jsonb`, `seed bool`, `last_run_at`, timestamps |
| `chats` | `id`, `user_id`, `title`, `focus_idea_id`, timestamps |
| `chat_messages` | `id`, `chat_id`, `role`, `content`, `references jsonb`, `actions jsonb`, `created_at` |
| `mcp_tokens` | `id`, `user_id`, `name`, `token_hash`, `last_used_at`, `created_at`, `revoked_at` |

- RLS on every table: `user_id = auth.uid()`. `chat_messages` is scoped through its chat. All foreign keys cascade from `auth.users`.
- A trigger on `auth.users` creates the `profiles` row. Seed ideas are inserted by an idempotent `ensureSeeded()` action on first bootstrap, keyed on `profiles.seeded_at`. It uses the TS seeds in `src/mock/seeds`.
- Generate types into `src/server/db/types.ts` with `supabase gen types`.

## Phases

### Phase 1: Foundations and auth
- `src/server/supabase/{server,browser,admin}.ts`: a cookie-based server client, a browser client, and a service-role client.
- `src/middleware.ts` (Next 15.5): refreshes the session and redirects unauthenticated `/app/*` requests to `/sign-in?next=…`.
- `src/components/marketing/auth-screen.tsx`: switch to `supabase.auth.signUp` and `signInWithPassword`, plus Google OAuth. Replace the copy "Any details work. Nothing is sent to a server." Add `src/app/auth/callback/route.ts` for OAuth and email confirmation.
- `src/services/account.ts`: `signIn`, `signOut` and `getSessionSync` wrap Supabase auth. `Session` comes from the Supabase user plus the profile.

### Phase 2: Persistence and server actions
- `src/server/actions/ideas.ts`: `listIdeas`, `getIdea`, `saveDraft`, `updateIntake`, `deleteIdea`, `createFromAlternative`, `setFindingState`, `recordWeightsChange` (replaces the closure at `account.tsx:108`), and `resetExamples` (replaces `resetDemoData` and re-inserts only the seeds).
- Each action checks the user and validates input with Zod. It reads, modifies and writes the row. When it appends history with a score, the server computes it with `computeReport`.
- `src/server/actions/settings.ts`: `getSettings` and `saveSettings`, stored in `profiles.settings`.
- `src/app/api/bootstrap/route.ts` returns `{ session, settings, ideas, chats }` and calls `ensureSeeded()`. `src/store/desy.ts` `hydrate()` becomes async and fetches it. Update the callers at `src/components/providers.tsx:12` and `src/components/settings/privacy.tsx:122`.
- `src/services/*` bodies call the actions. Remove the fake `delay()` calls. Delete `src/services/storage.ts` once nothing imports it.

### Phase 3: Analysis runs on the server (template generator)
- Move `src/mock/generator.ts` behind `src/server/engine/analyze.ts` with the signature `analyze(intake, opts) → Analysis`. This is the seam where real agents will plug in.
- `startAnalysis` becomes a server action. It generates the analysis, builds the `RunPlan` with the existing `buildRunPlan`, and saves `analysis`, `run` and `status = "running"`.
- `completeAnalysis` becomes a server action with the same logic: status complete, a history entry, and the score from `computeReport`. Make it idempotent so a reload or double "Skip to results" is harmless.
- `src/components/app/agent-run.tsx` stays unchanged. It still replays the saved `RunPlan`.
- Keep the demo controls `partialFailure` and `reducedMotionRuns` while the generator is templated.

### Phase 4: Chat and planner persistence (template logic)
- Chat: `startChat`, `addUserMessage`, `setChatFocus`, `renameChat` and `deleteChat` become server actions on `chats` and `chat_messages`. The keyword `replyTo` moves to `src/server/engine/chat-reply.ts` and runs on the server against the user's ideas, then saves the assistant message. `src/components/chat/chat.tsx` keeps calling `replyTo`.
- Planner: `createPlan`, `savePlan`, `saveNote`, `deleteNote`, `synthesize` and `applySynthesis` become server actions. `generatePlan` and `runSynthesis` move to `src/server/engine/planner.ts`, unchanged. `applySynthesis` recomputes the before and after scores on the server for the history entry.
- `savePlan` is debounced from `src/components/planner/research-planner.tsx:34`, which writes the whole plan. Keep that, but make the action reject a stale write by comparing `updated_at`.

### Phase 5: MCP server
- `src/app/api/mcp/[transport]/route.ts` using `mcp-handler`. Read-only tools: `list_ideas`, `get_idea_report` (runs `computeReport` on the server), `search_findings` (uses `queryFindings`), `get_research_plan`.
- Auth is `Authorization: Bearer <token>`. The server takes a SHA-256 of the token, looks it up in `mcp_tokens` with the service-role client, and scopes every query to that `user_id`.
- `src/components/settings/integrations.tsx`: the per-tool toggle becomes "Create token" (shown once), plus a list and revoke option. Each tool in `src/config/integrations.ts` shows a copyable config snippet. Remove `Settings.integrations`.

### Phase 6: Account, privacy and docs
- `src/components/settings/privacy.tsx`: `exportData` calls `GET /api/account/export`, which returns the full JSON. `deleteAllData` calls `POST /api/account/delete`, which uses `auth.admin.deleteUser` and lets the delete cascade. `storedBytes` comes from the server.
- Billing page: show usage counts from the DB. The "no checkout" message stays.
- README: setup, env vars, Supabase migrations, architecture. Update the "frontend-only demo" wording and the README section that says "This demo does not call the network…".

## Reused code (do not rewrite)
- `src/services/scoring.ts`: all scoring, `computeReport`, `diffReports`
- `src/services/sources.ts`: `queryFindings`, `usedIn`, `previewHide`
- `src/services/planner.ts`: `generatePlan`, `runSynthesis`, `synthesisAdjustments`, `previewSynthesis`
- `src/services/analysis.ts`: `buildRunPlan`, `frameworkLogs`
- `src/services/chat.ts`: the `replyTo` logic, moved to the server
- `src/mock/generator.ts`, `src/mock/seeds/*`, `src/config/*`, `src/lib/utils.ts`

## Verification
- `npm run typecheck`, `npm run lint` (zero warnings) and `npm test` stay green. Existing scoring and generator tests are unchanged.
- New vitest tests: Zod input schemas for the actions, token hashing and lookup, `completeAnalysis` idempotency, and the stale-write guard on `savePlan`.
- RLS check script: sign in two test users and confirm user B can't read or update user A's ideas, chats or tokens.
- Manual end to end in the user's existing dev server (never start a second `next dev`; see memory):
  - Sign up and check the three seeds appear.
  - Reload and confirm the data persists.
  - Sign in on a second browser and confirm the same data appears.
  - Create an idea, run it, use Skip to results, then open the report.
  - Hide a finding and check the score preview and history.
  - Chat, generate a plan, add notes, synthesize and apply.
  - Create an MCP token and call `list_ideas` through `npx @modelcontextprotocol/inspector`.
  - Export the data, delete the account, and confirm the rows are gone.
- Deploy a Vercel preview with env vars set and repeat sign-up, run and chat.

---

## Deferred: LLM work (later pass, not in this plan's scope)

Recorded so the next pass starts from decisions already made. Each item replaces a template in `src/server/engine/*` without changing the client.

- **Real research agents**:
  - Five agents (market, competitor, community, builder, signal) use Claude with web search and web fetch over public sources. Allowed domains come from `src/config/agents.ts`. Licensed databases (Statista, PitchBook, Crunchbase) stay off.
  - Agents write only findings and 0–4 judgments. Scoring stays in `src/services/scoring.ts`.
  - A framework agent produces the rest of `Analysis` with structured output constrained to ids in `src/config/criteria.ts`.
  - Runs move to Vercel Workflow, with live progress through a `run_events` table and Supabase Realtime. They replace the `RunPlan` replay in `agent-run.tsx` and the demo controls `partialFailure` and `reducedMotionRuns`.
  - Type changes when this lands: `partialFailure` becomes `failedAgents[]`, `trend` becomes nullable, and `SourceDef` gets `domains[]` plus a generic `web` source.
- **AI chat**: streaming route using the AI SDK `streamText`, with read-only tools (`list_ideas`, `get_report`, `search_findings`, `cite`, `suggest_action`). `chat.tsx` moves to `useChat`.
- **LLM planner and synthesis**: personas, screener, script, outreach, pitch and objections come from `generateObject`. Synthesis themes and quotes have server-checked verbatim evidence. `synthesisAdjustments` stays deterministic.
- **Cost controls**: a `usage` table with per-user daily quotas for runs and chat, returning 429 when exceeded.
- **Models**: Sonnet for agents and chat, Opus for framework and planner judgment. Model IDs go in `src/config/models.ts`.
- **Product decision**: which `accessConfirmed` flags in `src/config/sources.ts` flip once agents really use those sources.

---

## Implementation notes (where the build differs from the plan above)

- **Engine lives in `src/engine/`, not `src/server/engine/`.** The marketing demo (`scoring-visuals.tsx`) calls `generatePlan`, `runSynthesis` and `previewSynthesis` in the browser, so the template logic stays importable from both sides.
- **Account is the single page for account matters.** Scoring weights and demo run options were removed from Settings (defaults apply: equal weights, no simulated partial failures, normal run length), `recordWeightsChange` and the `weights`/`partialFailure`/`reducedMotionRuns` settings were deleted, and the Data privacy page was folded into Account (`/app/settings/privacy` redirects).
- **No sample data for regular accounts.** New accounts start empty and "Restore sample ideas" is gone. One private demo account for feedback sessions starts empty, created or wiped by `npm run demo:reset` (`scripts/demo-account.ts`, credentials in `.env.local`). `profiles.seeded_at` was dropped in migration `20261004010000`.
- **Stale writes**: every idea write goes through `mutateIdea` (versioned read-modify-write with retry), and `savePlan` keeps the server's notes and synthesis. This replaces the planned `updated_at` comparison.
- **Storage used** on Data privacy is an estimate made in the browser from the loaded workspace, not a server query.
- **Supabase CLI**: uses the globally installed `supabase` binary. The npm `supabase` dev dependency was dropped because its install script is blocked by npm's allowScripts.
- **MCP**: `mcp-handler` v2 with `@modelcontextprotocol/server` v2, mounted at `/api/mcp` (no `[transport]` segment needed).
- **Not done yet**: the live RLS run (`scripts/check-rls.mjs`) and manual end-to-end checks need a Supabase project. DB types aren't generated (`supabase gen types`) yet; `src/server/db.ts` uses hand-written row types.
