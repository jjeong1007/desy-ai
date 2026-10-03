"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FILTERS, FILTER_IDS, soloReadingFor } from "@/config/criteria";
import { SCORING_CONFIG } from "@/config/scoring";
import { PageSkeleton } from "@/components/app/app-shell";
import { BandBadge } from "@/components/report/markers";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Switch } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/overlay";
import { Segmented } from "@/components/ui/tabs";
import { reportFor, useWeights } from "@/lib/hooks";
import { saveSettings } from "@/services/account";
import { resetDemoData, updateIdea } from "@/services/ideas";
import { computeReport, weightsValid } from "@/services/scoring";
import { useDesy } from "@/store/desy";
import type { FilterId, Settings } from "@/types";

function redistribute(weights: Record<FilterId, number>, id: FilterId, raw: number): Record<FilterId, number> {
  const next = Math.round(Math.max(0, Math.min(100, raw)));
  const others = FILTER_IDS.filter((x) => x !== id);
  const rest = 100 - next;
  const sum = others.reduce((a, x) => a + weights[x], 0);
  const out: Record<FilterId, number> = { ...weights, [id]: next };
  if (sum <= 0) {
    const even = Math.floor(rest / others.length);
    let leftover = rest - even * others.length;
    for (const x of others) {
      out[x] = even + (leftover > 0 ? 1 : 0);
      leftover -= leftover > 0 ? 1 : 0;
    }
    return out;
  }
  const raws = others.map((x) => (weights[x] / sum) * rest);
  const floors = raws.map((n) => Math.floor(n));
  let leftover = rest - floors.reduce((a, b) => a + b, 0);
  const order = raws.map((n, i) => ({ i, frac: n - Math.floor(n) })).sort((a, b) => b.frac - a.frac);
  const adj = [...floors];
  for (const slot of order) {
    if (leftover <= 0) break;
    adj[slot.i] += 1;
    leftover -= 1;
  }
  others.forEach((x, i) => {
    out[x] = adj[i];
  });
  return out;
}

export function SettingsPage() {
  const hydrated = useDesy((s) => s.hydrated);
  const settings = useDesy((s) => s.settings);
  const ideas = useDesy((s) => s.ideas);
  const setSettings = useDesy((s) => s.setSettings);
  const upsert = useDesy((s) => s.upsertIdea);
  const setIdeas = useDesy((s) => s.setIdeas);
  const savedWeights = useWeights();
  const [draft, setDraft] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const form = draft ?? settings;
  const preview = useMemo(() => {
    if (!form) return [];
    return ideas
      .filter((i) => i.status === "complete" && i.analysis)
      .map((idea) => {
        const before = reportFor(idea, savedWeights);
        const after = computeReport({ idea, weights: form.weights, buildReading: (d) => soloReadingFor(d, idea.intake.buildPath) });
        return { idea, before, after };
      });
  }, [ideas, form, savedWeights]);

  if (!hydrated || !form || !settings) return <PageSkeleton />;

  const dirtyWeights = FILTER_IDS.some((id) => form.weights[id] !== settings.weights[id]);
  const valid = weightsValid(form.weights);

  const patch = (p: Partial<Settings>) => setDraft({ ...form, ...p });

  const save = async () => {
    if (!valid) {
      toast.error("Weights must add up to 100%.");
      return;
    }
    setBusy(true);
    try {
      const saved = await saveSettings({
        weights: form.weights,
        theme: form.theme,
        profile: form.profile,
        reducedMotionRuns: form.reducedMotionRuns,
        partialFailure: form.partialFailure,
      });
      setSettings(saved);
      setDraft(null);
      if (dirtyWeights) {
        for (const row of preview) {
          if (!row.before || !row.after) continue;
          if (row.before.score.overall === row.after.score.overall && row.before.score.band === row.after.score.band) continue;
          const updated = await updateIdea(
            row.idea.id,
            () => {},
            {
              kind: "weights",
              summary: `Scoring weights changed. Score ${row.before.score.overall} → ${row.after.score.overall}.`,
              scoreBefore: row.before.score.overall,
              scoreAfter: row.after.score.overall,
              bandBefore: row.before.score.band,
              bandAfter: row.after.score.band,
            },
          );
          upsert(updated);
        }
      }
      toast.success("Settings saved");
    } catch {
      toast.error("Couldn't save settings.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6">
      <h1 className="text-[32px] font-semibold leading-none">Settings</h1>
      <p className="mt-1 text-sm text-ink-2">Profile, theme, and the weights behind every Desy Score. Weights are a Desy assumption. The course framework does not specify them.</p>

      <section className="mt-8" aria-labelledby="profile-h">
        <h2 id="profile-h" className="text-lg font-semibold">Profile</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="profile-name">Name</Label>
            <Input id="profile-name" className="mt-1.5" value={form.profile.name} onChange={(e) => patch({ profile: { ...form.profile, name: e.target.value } })} />
          </div>
          <div>
            <Label htmlFor="profile-email">Email</Label>
            <Input id="profile-email" type="email" className="mt-1.5" value={form.profile.email} onChange={(e) => patch({ profile: { ...form.profile, email: e.target.value } })} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="profile-role">Role</Label>
            <Input id="profile-role" className="mt-1.5" value={form.profile.role} onChange={(e) => patch({ profile: { ...form.profile, role: e.target.value } })} />
          </div>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="theme-h">
        <h2 id="theme-h" className="text-lg font-semibold">Theme</h2>
        <div className="mt-3">
          <Segmented
            label="Color theme"
            value={form.theme}
            onChange={(theme) => patch({ theme })}
            options={[
              { id: "light", label: "Light" },
              { id: "dark", label: "Dark" },
              { id: "system", label: "System" },
            ]}
          />
        </div>
      </section>

      <section className="mt-8" aria-labelledby="weights-h">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="weights-h" className="text-lg font-semibold">Scoring weights</h2>
            <p className="mt-1 max-w-[62ch] text-sm text-ink-2">Equal weights by default; the course framework does not specify weights. Changing one filter redistributes the rest so the total stays 100%.</p>
          </div>
          <Button size="sm" onClick={() => patch({ weights: { ...SCORING_CONFIG.defaultWeights } })}>Reset to equal</Button>
        </div>
        <ul className="mt-4 space-y-4">
          {FILTERS.map((f) => (
            <li key={f.id}>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor={`w-${f.id}`}>{f.label}</Label>
                <span className="tnum text-sm font-medium">{form.weights[f.id]}%</span>
              </div>
              <input
                id={`w-${f.id}`}
                type="range"
                min={0}
                max={100}
                step={1}
                value={form.weights[f.id]}
                aria-valuetext={`${form.weights[f.id]} percent`}
                onChange={(e) => patch({ weights: redistribute(form.weights, f.id, Number(e.target.value)) })}
                className="mt-2 w-full accent-[rgb(var(--accent-strong))]"
              />
            </li>
          ))}
        </ul>
        <p className={valid ? "mt-2 text-sm text-ink-2" : "mt-2 text-sm text-weak"} role="status">
          Total {FILTER_IDS.reduce((a, id) => a + form.weights[id], 0)}%. {valid ? "Ready to save." : "Must equal 100%."}
        </p>

        <div className="mt-4 overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[520px] text-left text-sm">
            <caption className="border-b border-line px-3 py-2 text-left text-[13px] text-ink-2">Live recalculation with these weights. The score changes when you save. Caps never change the number.</caption>
            <thead className="text-xs text-ink-2">
              <tr>
                <th className="px-3 py-2 font-medium" scope="col">Idea</th>
                <th className="px-3 py-2 font-medium" scope="col">Now</th>
                <th className="px-3 py-2 font-medium" scope="col">With these weights</th>
              </tr>
            </thead>
            <tbody>
              {preview.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-ink-2">No completed ideas to preview.</td>
                </tr>
              ) : (
                preview.map(({ idea, before, after }) => (
                  <tr key={idea.id} className="border-t border-line">
                    <th className="px-3 py-2 text-left font-medium" scope="row">{idea.intake.name}</th>
                    <td className="px-3 py-2">{before ? <ScoreCell score={before.score.overall} band={before.score.band} capped={before.score.band !== before.score.uncappedBand} /> : "—"}</td>
                    <td className="px-3 py-2">
                      {after ? <ScoreCell score={after.score.overall} band={after.score.band} capped={after.score.band !== after.score.uncappedBand} changed={!!before && (before.score.overall !== after.score.overall || before.score.band !== after.score.band)} /> : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="demo-h">
        <h2 id="demo-h" className="text-lg font-semibold">Demo preferences</h2>
        <div className="mt-3 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Shorter agent runs</p>
              <p className="text-xs text-ink-2">Compresses the simulated research run. Useful if you prefer reduced motion.</p>
            </div>
            <Switch id="motion" label="Shorter agent runs" checked={form.reducedMotionRuns} onCheckedChange={(reducedMotionRuns) => patch({ reducedMotionRuns })} />
          </div>
          <div>
            <Label htmlFor="partial">Partial agent failure</Label>
            <p id="partial-hint" className="mt-1 text-xs text-ink-2">About 30% of new runs return one partial agent, so you can see a low-confidence cap. Sample ideas keep their curated evidence unless this is set to Always.</p>
            <Select id="partial" className="mt-2" aria-describedby="partial-hint" value={form.partialFailure} onChange={(e) => patch({ partialFailure: e.target.value as Settings["partialFailure"] })}>
              <option value="random">Random, about 30%</option>
              <option value="always">Always</option>
              <option value="never">Never</option>
            </Select>
          </div>
        </div>
      </section>

      <div className="mt-8 flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => void save()} disabled={busy || !valid}>{busy ? "Saving…" : "Save settings"}</Button>
        <Button variant="ghost" onClick={() => setDraft(null)} disabled={!draft || busy}>Discard changes</Button>
      </div>

      <section className="mt-10 border-t border-line pt-6" aria-labelledby="reset-h">
        <h2 id="reset-h" className="text-lg font-semibold">Sample data</h2>
        <p className="mt-1 max-w-[62ch] text-sm text-ink-2">Replaces your ideas with the three samples. Your sign-in and these settings stay.</p>
        <Button className="mt-3" onClick={() => setConfirmReset(true)}>Restore sample ideas</Button>
        <ConfirmDialog
          open={confirmReset}
          onOpenChange={setConfirmReset}
          title="Restore sample ideas?"
          description="Your ideas, notes, and research plans on this device are replaced with the three samples. This can't be undone."
          confirmLabel="Restore samples"
          onConfirm={async () => {
            setIdeas(await resetDemoData());
            setConfirmReset(false);
            toast.success("Sample ideas restored");
          }}
        />
      </section>
    </div>
  );
}

function ScoreCell({ score, band, capped, changed }: { score: number; band: "strong" | "promising" | "weak"; capped: boolean; changed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="tnum font-medium">{score}</span>
      <BandBadge band={band} capped={capped} size="sm" />
      {changed ? <span className="rounded bg-accent-tint px-1.5 py-0.5 text-xs font-medium text-accent-strong">Recalculated</span> : null}
    </span>
  );
}
