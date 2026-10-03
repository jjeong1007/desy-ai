# Desy

Desy scores a small SaaS idea before you build it. This repository is a frontend-only demo: marketing site, mock sign-in, and the logged-in product. Research agents, scoring, and interview synthesis all run in the browser against mock data. A real backend can replace the service layer without rewriting the screens.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Script | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint, zero warnings |
| `npm test` | Vitest unit tests for scoring and report generation |

Any email and password signs you in. Ideas, notes, and settings persist in `localStorage` under `desy:v1`. If storage is empty or unreadable, the app falls back to three seeded ideas.

## Route map

**Marketing**

- `/` landing page
- `/pricing` placeholder tiers (no checkout)
- `/sign-in` and `/sign-up` mock auth; any input succeeds and continues to `next` or `/app`

**Product** (requires a mock session)

- `/app` dashboard: sort, filter, compare 2–3 ideas
- `/app/ideas/new` multi-step intake (`?draft=` resumes a draft, `?edit=` edits an existing idea)
- `/app/ideas/[id]` workspace with Overview, Data Sources, and Research Planner
- `/app/ideas/[id]/run` simulated agent run, with Skip to results
- `/app/ideas/[id]/print?doc=report` or `?doc=plan` print view
- `/app/settings` profile, theme, scoring weights, demo run options

## Folder structure

```
src/app            routes
src/components     UI: marketing, app shell, report, sources, planner
src/services       async data access (swap these for an API)
src/config         scoring thresholds, the 25 criteria, agents, source registry
src/mock           knowledge base, seeds, report generator
src/store          Zustand cache over the services
src/types          shared TypeScript types
tests              scoring and generator tests
```

## Where the mock content lives

- **Source registry:** `src/config/sources.ts`. Each source has `accessConfirmed`. The marketing site and FAQ name a source only when that flag is true. Until then they speak in categories (community forums, open-source repositories, product directories and review sites, search-trend data, startup and funding news). Paid databases (PitchBook, Statista, Crunchbase) start as `false`. SEC EDGAR is omitted on purpose.
- **Knowledge base:** `src/mock/knowledge-base.ts`. Framework tags show "From the course" and "Desy's interpretation."
- **Seeds:** `src/mock/seeds/`. Invoice reminders (strong), tutor scheduling (promising, no-code founder), generic AI notes (score in the Promising range, band capped at Weak).
- **New ideas:** `src/mock/generator.ts` builds a report from the intake. Scores and bands always come from `src/services/scoring.ts`, never from the generator writing them directly.

Re-running a seeded example keeps its curated findings unless Settings → Partial agent failure is set to Always. Newly created ideas always go through the generator. Computed criteria (sizable customer base, margins, CAC payback, and "Will it make money?") still follow the current price, goal, and running cost.

## Scoring model

Two frameworks do different jobs.

- **Five filters score the opportunity** (Customer, Economic, Competition, Channel, Timing). Labels and the 25 criteria come from "Scoring Opportunities with Filters."
- **Real / Win / Worth It is a gate** for this founder. Real = product/market fit, Win = product/company fit, Worth It = product/business fit. It never changes the Desy Score. It can cap the pursuit band.

### Criteria and filters

Each criterion is 0–4, or `null` ("Needs evidence") when nothing supports it. Unscored criteria are left out of the filter average and lower confidence.

Filter score = (sum of scored criteria ÷ (4 × number scored)) × 100. Null if none are scored.

A filter is **low confidence** when 3 or more of its 5 criteria are unscored. A null filter is also low confidence. It still counts at its weight when it has a score. A null filter is excluded and the remaining weights are renormalized.

**Desy Score** = weighted mean of the non-null filter scores, rounded. Default weights are 20% each and must sum to 100%. Change them in Settings. The report shows the weights in use.

### Pursuit bands and caps

| Band | Score |
| --- | --- |
| Strong pursuit | 70–100 |
| Promising, needs work | 45–69 |
| Weak pursuit | 0–44 |

Caps apply after the score band. The lowest cap wins. Caps never change the number.

1. Any RWW pillar = No → Weak
2. Any knockout filter (below 40) → Promising
3. Any low-confidence filter, including a null filter → Promising ("Not enough evidence in [filter] to call this strong.")

### Real / Win / Worth It

Each sub-question is Yes / Maybe / No. Unanswered counts as Maybe.

Net answer (Desy assumption, not from the 3M checklist):

- **No** if any critical sub-question is No
- **Yes** if every sub-question is Yes, or only one is Maybe
- **Probably** otherwise

Consistency caps, applied in `services/scoring.ts`:

- Real cannot be Yes if Customer is below 50
- Win cannot be Yes if Competition is below 40
- Worth It cannot be Yes if Path to MRR needs more customers than the obtainable market

If a rule would be violated, the net answer is capped at Probably and the reason is shown.

### Confidence

Overall confidence uses the share of the 25 criteria that have at least one visible finding, and the number of distinct sources (`src/config/scoring.ts`):

- High: at least 85% of criteria have evidence, and at least 8 sources
- Medium: at least 65% and at least 5 sources
- Low: otherwise

Filter confidence: High if every criterion is scored, Medium if 1–2 are unscored, Low if 3 or more are unscored.

### What recalculates the score

These all go through `computeReport` in `services/scoring.ts`:

- Path to MRR price and goal
- Hiding or restoring a finding (with a before/after preview)
- Scoring weights in Settings
- Applying interview synthesis

## Replacing a service with a real API

Components call async functions and then write the returned entities into the Zustand store. They do not read `localStorage` themselves.

| Module | Replace with |
| --- | --- |
| `services/ideas.ts` | CRUD for ideas and drafts |
| `services/analysis.ts` | Start a run and stream agent events. Today it computes the analysis immediately and the run view replays `RunPlan`. |
| `services/scoring.ts` | Keep the pure functions if the server returns the same inputs; or have the server return a `Report` in the same shape. Do not reimplement thresholds in components. |
| `services/sources.ts` | Findings query, pin/note/hide, hide preview |
| `services/planner.ts` | Plan generation and synthesis |
| `services/account.ts` | Real auth and settings |
| `services/storage.ts` | Delete once the services talk to the API |

Types live in `src/types/index.ts`. Keep response shapes the same and the UI can stay.

When a data integration ships, set `accessConfirmed: true` on that source in `src/config/sources.ts`. The marketing sources section and FAQ will start naming it. No other copy change is required.

## Assumptions that need calibration

None of the following come from the course frameworks. They are Desy's, collected in `src/config/scoring.ts` and `src/config/criteria.ts`, and they need calibration:

- Default scoring weights (20% each) and the rule that weights sum to 100%
- Pursuit bands: 45 and 70
- Knockout threshold: 40. Consistency thresholds: Customer 50 for Real, Competition 40 for Win
- Band cap rules (RWW No → Weak; knockout → Promising; low confidence → Promising; lowest cap wins; caps never change the score)
- RWW net-answer rule and which sub-questions are critical
- 0–4 anchors (contradicts, weak, mixed, supported, strongly supported)
- Solo SaaS readings of criteria written for corporations, including build-path readings
- Confidence cutoffs above
- Derived cutoffs for market size, margin, CAC payback, and "Will it make money?"
- Low-confidence definition: 3 or more unscored criteria out of 5

Other product assumptions, also listed so they can be revisited:

- The 3M checklist assigns a pillar's net answer by judgment. Desy's formula is a repeatable stand-in. It matches the Spoil My Spouse example (three Maybes → Probably) but is not taken from the source.
- "Strong IP assets" is read as proprietary data, integrations, or specialist knowledge. Low scores are normal for solo SaaS.
- "White label opportunities" is read as partnerships, integrations, app marketplaces, or resellers.
- "Not sure yet" on build path leaves Low development costs as Needs evidence.
- Hiding a finding removes it from the next score. Interview synthesis writes adjustments the scoring functions apply on top of the agent judgments.
- This demo does not call the network for research, auth, or payments. Agent timing is a replay of about 20–40 seconds, with Skip to results.
- Placeholder prices on the marketing site are not a billing integration. The demo does not enforce the Free tier's one-idea limit.
