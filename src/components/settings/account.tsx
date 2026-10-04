"use client";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FILTERS, FILTER_IDS, soloReadingFor } from "@/config/criteria";
import { SCORING_CONFIG } from "@/config/scoring";
import { PageSkeleton } from "@/components/app/app-shell";
import { BandBadge } from "@/components/report/markers";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Switch } from "@/components/ui/field";
import { Avatar } from "@/components/ui/avatar";
import { SettingRow, SettingsHeader, SettingsSection } from "@/components/settings/settings-shell";
import { Segmented } from "@/components/ui/tabs";
import { reportFor, useWeights } from "@/lib/hooks";
import { applyTheme } from "@/components/theme-toggle";
import { relTime } from "@/lib/utils";
import { saveSettings, signOut } from "@/services/account";
import { updateIdea } from "@/services/ideas";
import { computeReport, weightsValid } from "@/services/scoring";
import { useDesy } from "@/store/desy";
import type { FilterId, ScoreResult, Settings } from "@/types";

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

export function AccountSettings() {
  const hydrated = useDesy((s) => s.hydrated);
  const settings = useDesy((s) => s.settings);
  const ideas = useDesy((s) => s.ideas);
  const setSettings = useDesy((s) => s.setSettings);
  const upsert = useDesy((s) => s.upsertIdea);
  const session = useDesy((s) => s.session);
  const setSession = useDesy((s) => s.setSession);
  const router = useRouter();
  const savedWeights = useWeights();
  const [draft, setDraft] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);

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
    <div>
      <SettingsHeader title="Account" description="Your profile, how Desy looks, and the weights behind every Desy Score." />

      <SettingsSection id="profile" title="Profile" description="Shown in your workspace and used to personalize prompts.">
        <div className="flex items-center gap-4 pb-4">
          <Avatar size="lg" name={form.profile.name || session?.name} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-body font-medium text-fg">{form.profile.name || session?.name || "Your name"}</span>
            <span className="truncate text-small text-fg-secondary">{form.profile.email || session?.email}</span>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
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
      </SettingsSection>

      <SettingsSection id="appearance" title="Appearance" description="Applies right away on this device.">
        <Segmented
          label="Color theme"
          value={form.theme}
          onChange={async (theme) => {
            patch({ theme });
            applyTheme(theme);
            setSettings(await saveSettings({ theme }));
          }}
          options={[
            { id: "light", label: "Light" },
            { id: "dark", label: "Dark" },
            { id: "system", label: "System" },
          ]}
        />
      </SettingsSection>

      <SettingsSection
        id="weights"
        title="Scoring weights"
        description="Equal weights by default. Changing one filter redistributes the rest so the total stays 100%."
        actions={<Button size="sm" onClick={() => patch({ weights: { ...SCORING_CONFIG.defaultWeights } })}>Reset to equal</Button>}
      >
        <ul className="m-0 list-none space-y-4 p-0">
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
            <caption className="border-b border-line px-3 py-2 text-left text-[13px] text-ink-2">Live recalculation with these weights. The score changes when you save.</caption>
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
                    <td className="px-3 py-2">{before ? <ScoreCell score={before.score.overall} band={before.score.band} result={before.score} /> : "—"}</td>
                    <td className="px-3 py-2">
                      {after ? <ScoreCell score={after.score.overall} band={after.score.band} result={after.score} changed={!!before && (before.score.overall !== after.score.overall || before.score.band !== after.score.band)} /> : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SettingsSection>

      <SettingsSection id="demo" title="Demo preferences" description="Controls for the simulated research run.">
        <div className="divide-y divide-line">
          <SettingRow title="Shorter agent runs" description="Compresses the simulated research run. Useful if you prefer reduced motion.">
            <Switch id="motion" label="Shorter agent runs" checked={form.reducedMotionRuns} onCheckedChange={(reducedMotionRuns) => patch({ reducedMotionRuns })} />
          </SettingRow>
          <SettingRow
            title={<label htmlFor="partial">Partial agent failure</label>}
            description={<span id="partial-hint">About 30% of new runs return one partial agent, so you can see a low-confidence cap. Sample ideas keep their curated evidence unless this is set to Always.</span>}
          >
            <Select id="partial" aria-describedby="partial-hint" value={form.partialFailure} onChange={(e) => patch({ partialFailure: e.target.value as Settings["partialFailure"] })}>
              <option value="random">Random, about 30%</option>
              <option value="always">Always</option>
              <option value="never">Never</option>
            </Select>
          </SettingRow>
        </div>
      </SettingsSection>

      {draft ? (
        <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-2 border-t border-line bg-canvas px-4 py-3 md:-mx-8 md:px-8">
          <span className="mr-auto text-small text-fg-secondary">You have unsaved changes.</span>
          <Button variant="ghost" onClick={() => setDraft(null)} disabled={busy}>Discard</Button>
          <Button variant="primary" onClick={() => void save()} disabled={busy || !valid}>{busy ? "Saving…" : "Save changes"}</Button>
        </div>
      ) : null}

      <SettingsSection id="session" title="Session" description={session ? `Signed in as ${session.email} since ${relTime(session.signedInAt)}.` : undefined}>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={async () => {
              await signOut();
              setSession(null);
              toast.success("Signed out");
              router.push("/");
            }}
          >
            <LogOut /> Sign out
          </Button>
          <Button asChild variant="ghost">
            <Link href="/app/settings/privacy#delete">Delete all data</Link>
          </Button>
        </div>
      </SettingsSection>
    </div>
  );
}

function ScoreCell({ score, band, result, changed }: { score: number; band: "strong" | "promising" | "weak"; result: ScoreResult; changed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="tnum font-medium">{score}</span>
      <BandBadge band={band} score={result} size="sm" />
      {changed ? <span className="rounded bg-accent-tint px-1.5 py-0.5 text-xs font-medium text-accent-strong">Recalculated</span> : null}
    </span>
  );
}
