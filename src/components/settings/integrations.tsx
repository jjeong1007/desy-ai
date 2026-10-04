"use client";
import { Copy, KeyRound, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageSkeleton } from "@/components/app/app-shell";
import { SettingsHeader, SettingsSection } from "@/components/settings/settings-shell";
import { SourceLabel } from "@/components/sources/data-sources";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/overlay";
import { Tag } from "@/components/ui/tag";
import { AGENT_NAME } from "@/config/agents";
import { AI_TOOLS } from "@/config/integrations";
import { SOURCES } from "@/config/sources";
import { cn, copyText, relTime } from "@/lib/utils";
import { createMcpToken, listMcpTokens, revokeMcpToken, type McpToken } from "@/server/actions/mcp-tokens";
import { useDesy } from "@/store/desy";
import type { AgentId } from "@/types";

const RESEARCH_SOURCES = SOURCES.filter((s) => s.agentId !== "founder");
const BY_AGENT = Object.entries(
  RESEARCH_SOURCES.reduce<Record<string, typeof RESEARCH_SOURCES>>((acc, s) => {
    (acc[s.agentId] ??= []).push(s);
    return acc;
  }, {}),
) as [AgentId, typeof RESEARCH_SOURCES][];

/** MCP client config for a remote server with a bearer token. Most tools accept this shape. */
function configSnippet(url: string, token: string) {
  return JSON.stringify({ mcpServers: { desy: { url, headers: { Authorization: `Bearer ${token}` } } } }, null, 2);
}

function CopyButton({ text, label }: { text: string; label: string }) {
  return (
    <Button
      size="sm"
      onClick={async () => {
        if (await copyText(text)) toast.success(`${label} copied`);
        else toast.error("Couldn't copy. Select the text and copy it instead.");
      }}
    >
      <Copy /> Copy
    </Button>
  );
}

function AiToolAccess() {
  const [tokens, setTokens] = useState<McpToken[] | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ token: string; name: string } | null>(null);
  const [revoking, setRevoking] = useState<McpToken | null>(null);
  const [url, setUrl] = useState("/api/mcp");

  useEffect(() => {
    setUrl(`${window.location.origin}/api/mcp`);
    listMcpTokens()
      .then(setTokens)
      .catch(() => {
        setTokens([]);
        toast.error("Couldn't load your access tokens.");
      });
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const label = name.trim() || "AI tool";
    setBusy(true);
    try {
      const { token, record } = await createMcpToken(label);
      setTokens((t) => [record, ...(t ?? [])]);
      setCreated({ token, name: label });
      setName("");
    } catch {
      toast.error("Couldn't create a token.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {AI_TOOLS.map((t) => (
          <span key={t.id} className="inline-flex items-center gap-2 rounded-sm border border-line bg-canvas px-2.5 py-1.5 text-small text-fg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={t.logo} alt="" className={cn("size-4 object-contain", t.mono && "dark:invert")} />
            {t.name}
          </span>
        ))}
      </div>

      <form onSubmit={create} className="flex flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1">
          <Label htmlFor="token-name">Token name</Label>
          <Input id="token-name" className="mt-1.5" placeholder="e.g. Cursor on my laptop" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        </div>
        <Button type="submit" variant="primary" disabled={busy}>
          <KeyRound /> {busy ? "Creating…" : "Create token"}
        </Button>
      </form>

      {created ? (
        <div className="flex flex-col gap-3 rounded-lg border border-brand bg-muted p-4" role="status">
          <p className="m-0 text-small text-fg">
            <span className="font-medium">{created.name}</span> is ready. Copy it now: it won&apos;t be shown again.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-sm border border-line bg-canvas px-2 py-1.5 font-mono text-xs">{created.token}</code>
            <CopyButton text={created.token} label="Token" />
          </div>
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-small font-medium text-fg">Add this to your tool&apos;s MCP settings</span>
              <CopyButton text={configSnippet(url, created.token)} label="Config" />
            </div>
            <pre className="m-0 mt-2 overflow-x-auto rounded-sm border border-line bg-canvas p-3 font-mono text-xs">{configSnippet(url, created.token)}</pre>
          </div>
          <div>
            <Button size="sm" variant="ghost" onClick={() => setCreated(null)}>Done</Button>
          </div>
        </div>
      ) : null}

      <div>
        <h3 className="m-0 text-small font-semibold text-fg">Active tokens</h3>
        {tokens === null ? (
          <p className="m-0 mt-2 text-small text-fg-tertiary">Loading…</p>
        ) : tokens.length === 0 ? (
          <p className="m-0 mt-2 text-small text-fg-tertiary">No tokens yet. Create one for each tool you connect.</p>
        ) : (
          <ul className="m-0 mt-2 flex list-none flex-col divide-y divide-line rounded-lg border border-line p-0">
            {tokens.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <span className="flex min-w-0 flex-col">
                  <span className="flex items-center gap-2 text-body font-medium text-fg">
                    {t.name} <code className="font-mono text-xs text-fg-tertiary">{t.prefix}</code>
                  </span>
                  <span className="text-small text-fg-secondary">
                    Created {relTime(t.createdAt)} · {t.lastUsedAt ? `last used ${relTime(t.lastUsedAt)}` : "never used"}
                  </span>
                </span>
                <Button size="sm" variant="ghost" onClick={() => setRevoking(t)}>
                  <Trash2 /> Revoke
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={!!revoking}
        onOpenChange={(o) => !o && setRevoking(null)}
        title={`Revoke ${revoking?.name ?? "token"}?`}
        description="Any tool using this token loses access right away. This can't be undone."
        confirmLabel="Revoke token"
        onConfirm={async () => {
          if (!revoking) return;
          try {
            await revokeMcpToken(revoking.id);
            setTokens((list) => (list ?? []).filter((x) => x.id !== revoking.id));
            toast.success("Token revoked");
          } catch {
            toast.error("Couldn't revoke the token.");
          }
          setRevoking(null);
        }}
      />
    </div>
  );
}

export function IntegrationsSettings() {
  const hydrated = useDesy((s) => s.hydrated);
  if (!hydrated) return <PageSkeleton />;

  return (
    <div>
      <SettingsHeader title="Integrations" description="Connect the AI tools you build with, and see where Desy's research comes from." />

      <SettingsSection id="mcp" title="AI tools" description="Connected tools can read your ideas, scores, findings and research plans over MCP, so they build with the same context you have. Access is read-only; revoke a token at any time.">
        <AiToolAccess />
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
