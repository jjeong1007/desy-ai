"use client";
import { useState } from "react";
import { toast } from "sonner";
import { PageSkeleton } from "@/components/app/app-shell";
import { SettingsHeader, SettingsSection } from "@/components/settings/settings-shell";
import { SourceLabel } from "@/components/sources/data-sources";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { AGENT_NAME } from "@/config/agents";
import { AI_TOOLS } from "@/config/integrations";
import { SOURCES } from "@/config/sources";
import { cn } from "@/lib/utils";
import { saveSettings } from "@/services/account";
import { useDesy } from "@/store/desy";
import type { AgentId } from "@/types";

const RESEARCH_SOURCES = SOURCES.filter((s) => s.agentId !== "founder");
const BY_AGENT = Object.entries(
  RESEARCH_SOURCES.reduce<Record<string, typeof RESEARCH_SOURCES>>((acc, s) => {
    (acc[s.agentId] ??= []).push(s);
    return acc;
  }, {}),
) as [AgentId, typeof RESEARCH_SOURCES][];

export function IntegrationsSettings() {
  const hydrated = useDesy((s) => s.hydrated);
  const settings = useDesy((s) => s.settings);
  const setSettings = useDesy((s) => s.setSettings);
  const [busy, setBusy] = useState<string | null>(null);
  if (!hydrated || !settings) return <PageSkeleton />;

  const connected = new Set(settings.integrations);
  const toggle = async (id: string, name: string) => {
    setBusy(id);
    const on = !connected.has(id);
    const next = on ? [...settings.integrations, id] : settings.integrations.filter((x) => x !== id);
    try {
      setSettings(await saveSettings({ integrations: next }));
      toast.success(on ? `${name} connected. Simulated in this demo; nothing leaves your browser.` : `${name} disconnected`);
    } catch {
      toast.error("Couldn't update the integration.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <SettingsHeader title="Integrations" description="Connect the AI tools you build with, and see where Desy's research comes from." />

      <SettingsSection id="mcp" title="AI tools" description="Connected tools can read your ideas, scores, findings and interview notes over MCP, so they build with the same context you have.">
        <ul className="m-0 flex list-none flex-col divide-y divide-line rounded-lg border border-line p-0">
          {AI_TOOLS.map((t) => {
            const on = connected.has(t.id);
            return (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-sm border border-line bg-canvas">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.logo} alt="" className={cn("size-5 object-contain", t.mono && "dark:invert")} />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="flex items-center gap-2 text-body font-medium text-fg">
                      {t.name}
                      {on ? <Tag variant="brand">Connected</Tag> : null}
                    </span>
                    <span className="truncate text-small text-fg-secondary">{on ? "Can read this workspace" : `Give ${t.name} read access to your workspace`}</span>
                  </span>
                </span>
                <Button size="sm" variant={on ? "ghost" : "outline"} disabled={busy === t.id} onClick={() => void toggle(t.id, t.name)}>
                  {busy === t.id ? "Saving…" : on ? "Disconnect" : "Connect"}
                </Button>
              </li>
            );
          })}
        </ul>
        <p className="m-0 mt-3 text-small text-fg-tertiary">Connections are simulated in this demo. Access is read-only, and you can disconnect at any time.</p>
      </SettingsSection>

      <SettingsSection id="sources" title="Research sources" description="Where each agent looks during a research run. In this demo, agents replay sample findings instead of calling these sources.">
        <div className="flex flex-col gap-3">
          {BY_AGENT.map(([agent, sources]) => (
            <div key={agent} className="rounded-lg border border-line">
              <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
                <span className="text-small font-semibold text-fg">{AGENT_NAME[agent]}</span>
                <Tag>Simulated</Tag>
              </div>
              <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
                {sources.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                    <SourceLabel sourceId={s.id} className="text-body text-fg" />
                    <span className="text-small text-fg-tertiary">{s.category}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </SettingsSection>
    </div>
  );
}
