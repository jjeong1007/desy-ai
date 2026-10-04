"use client";
import { Download, HardDrive, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageSkeleton } from "@/components/app/app-shell";
import { SettingRow, SettingsHeader, SettingsSection } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/overlay";
import { applyTheme } from "@/components/theme-toggle";
import { deleteAllData, exportData, storedBytes } from "@/services/account";
import { resetDemoData } from "@/services/ideas";
import { useDesy } from "@/store/desy";

function fmtBytes(n: number) {
  return n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function PrivacySettings() {
  const hydrated = useDesy((s) => s.hydrated);
  const ideas = useDesy((s) => s.ideas);
  const chats = useDesy((s) => s.chats);
  const setIdeas = useDesy((s) => s.setIdeas);
  const hydrate = useDesy((s) => s.hydrate);
  const router = useRouter();
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [bytes, setBytes] = useState<number | null>(null);

  // Recount whenever the workspace changes.
  useEffect(() => {
    if (hydrated) setBytes(storedBytes());
  }, [hydrated, ideas, chats]);

  if (!hydrated) return <PageSkeleton />;

  const notes = ideas.reduce((n, i) => n + (i.plan?.notes.length ?? 0), 0);
  const stored = [
    { label: "Ideas", value: ideas.length },
    { label: "Chats", value: chats.length },
    { label: "Interview notes", value: notes },
    { label: "Storage used", value: bytes == null ? "—" : fmtBytes(bytes) },
  ];

  const download = () => {
    const url = URL.createObjectURL(new Blob([exportData()], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `desy-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export downloaded");
  };

  return (
    <div>
      <SettingsHeader title="Data privacy" description="What Desy stores, where it lives, and how to take it with you or remove it." />

      <SettingsSection id="where" title="Where your data lives">
        <div className="flex items-start gap-3 rounded-lg border border-line bg-muted p-4">
          <HardDrive className="mt-0.5 size-4 shrink-0 text-fg-secondary" aria-hidden />
          <p className="m-0 text-small text-fg-secondary">
            This demo has no account server. Your ideas, chats, interview notes and settings are saved in this browser&apos;s local storage and are never sent anywhere. Signing out keeps them on this device; clearing site data or deleting below removes them.
          </p>
        </div>
        <dl className="m-0 mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stored.map((s) => (
            <div key={s.label} className="flex flex-col gap-1 rounded-lg border border-line p-4">
              <dt className="text-small text-fg-secondary">{s.label}</dt>
              <dd className="tnum m-0 text-heading font-semibold text-fg">{s.value}</dd>
            </div>
          ))}
        </dl>
      </SettingsSection>

      <SettingsSection id="manage" title="Manage your data">
        <div className="divide-y divide-line">
          <SettingRow title="Export your data" description="Download everything in this workspace as a JSON file.">
            <Button onClick={download}>
              <Download /> Download
            </Button>
          </SettingRow>
          <SettingRow title="Restore sample ideas" description="Replaces your ideas with the three samples. Your sign-in, chats and settings stay.">
            <Button onClick={() => setConfirmReset(true)}>
              <RotateCcw /> Restore samples
            </Button>
          </SettingRow>
        </div>
      </SettingsSection>

      <SettingsSection id="delete" title="Delete all data">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-weak/40 bg-weak-tint/40 p-4">
          <p className="m-0 max-w-[52ch] text-small text-fg-secondary">Removes every idea, chat, note and setting from this browser and signs you out. If you sign in again, you start fresh with the sample ideas. This can&apos;t be undone.</p>
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            <Trash2 /> Delete all data
          </Button>
        </div>
      </SettingsSection>

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
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete all data?"
        description="Every idea, chat, interview note and setting stored in this browser is removed, and you're signed out. This can't be undone."
        confirmLabel="Delete everything"
        onConfirm={async () => {
          await deleteAllData();
          setConfirmDelete(false);
          // Reload the store from the now-empty browser: signed out, like a first visit.
          hydrate();
          applyTheme("system");
          toast.success("All data deleted");
          router.push("/");
        }}
      />
    </div>
  );
}
