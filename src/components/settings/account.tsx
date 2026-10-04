"use client";
import { Download, LogOut, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageSkeleton } from "@/components/app/app-shell";
import { SettingRow, SettingsHeader, SettingsSection } from "@/components/settings/settings-shell";
import { applyTheme } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/overlay";
import { Segmented } from "@/components/ui/tabs";
import { relTime } from "@/lib/utils";
import { deleteAllData, exportData, saveSettings, signOut } from "@/services/account";
import { useDesy } from "@/store/desy";
import type { Settings } from "@/types";

function fmtBytes(n: number) {
  return n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Everything about the account in one place: profile, appearance, your data, and signing out or deleting. */
export function AccountSettings() {
  const hydrated = useDesy((s) => s.hydrated);
  const settings = useDesy((s) => s.settings);
  const session = useDesy((s) => s.session);
  const ideas = useDesy((s) => s.ideas);
  const chats = useDesy((s) => s.chats);
  const setSettings = useDesy((s) => s.setSettings);
  const reset = useDesy((s) => s.reset);
  const router = useRouter();
  const [draft, setDraft] = useState<Settings["profile"] | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Approximate: the size of the workspace as JSON, which is how it's stored.
  const bytes = useMemo(() => (hydrated ? new Blob([JSON.stringify({ ideas, chats })]).size : null), [hydrated, ideas, chats]);

  if (!hydrated || !settings) return <PageSkeleton />;

  const profile = draft ?? settings.profile;
  const notes = ideas.reduce((n, i) => n + (i.plan?.notes.length ?? 0), 0);
  const stored = [
    { label: "Ideas", value: ideas.length },
    { label: "Chats", value: chats.length },
    { label: "Interview notes", value: notes },
    { label: "Storage used", value: bytes == null ? "—" : fmtBytes(bytes) },
  ];

  const saveProfile = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      setSettings(await saveSettings({ profile: draft }));
      setDraft(null);
      toast.success("Profile saved");
    } catch {
      toast.error("Couldn't save your profile.");
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    try {
      const url = URL.createObjectURL(await exportData());
      const a = document.createElement("a");
      a.href = url;
      a.download = `desy-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch {
      toast.error("Couldn't export your data. Try again.");
    }
  };

  return (
    <div>
      <SettingsHeader title="Account" description="Your profile, how Desy looks, and your data." />

      <SettingsSection id="profile" title="Profile" description="Shown in your workspace and used to personalize prompts.">
        <div className="flex items-center gap-4 pb-4">
          <Avatar size="lg" name={profile.name || session?.name} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-body font-medium text-fg">{profile.name || session?.name || "Your name"}</span>
            <span className="truncate text-small text-fg-secondary">{settings.profile.email || session?.email}</span>
            {session ? <span className="text-small text-fg-tertiary">Signed in {relTime(session.signedInAt)}</span> : null}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="profile-name">Name</Label>
            <Input id="profile-name" className="mt-1.5" value={profile.name} maxLength={200} onChange={(e) => setDraft({ ...profile, name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="profile-email">Email</Label>
            <Input id="profile-email" type="email" className="mt-1.5" value={profile.email} readOnly aria-describedby="profile-email-hint" />
            <p id="profile-email-hint" className="mt-1 text-xs text-fg-tertiary">The email you sign in with.</p>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="profile-role">Role</Label>
            <Input id="profile-role" className="mt-1.5" value={profile.role} maxLength={200} onChange={(e) => setDraft({ ...profile, role: e.target.value })} />
          </div>
        </div>
        {draft ? (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setDraft(null)} disabled={busy}>Discard</Button>
            <Button variant="primary" onClick={() => void saveProfile()} disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
          </div>
        ) : null}
      </SettingsSection>

      <SettingsSection id="appearance" title="Appearance" description="Applies right away and follows you to other devices.">
        <Segmented
          label="Color theme"
          value={settings.theme}
          onChange={async (theme) => {
            applyTheme(theme);
            try {
              setSettings(await saveSettings({ theme }));
            } catch {
              toast.error("Couldn't save your theme.");
            }
          }}
          options={[
            { id: "light", label: "Light" },
            { id: "dark", label: "Dark" },
            { id: "system", label: "System" },
          ]}
        />
      </SettingsSection>

      <SettingsSection id="data" title="Your data" description="Your ideas, chats, interview notes and settings are stored with your Desy account. Only you can read them. AI tools you connect under Integrations get read-only access until you revoke their token.">
        <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stored.map((s) => (
            <div key={s.label} className="flex flex-col gap-1 rounded-lg border border-line p-4">
              <dt className="text-small text-fg-secondary">{s.label}</dt>
              <dd className="tnum m-0 text-heading font-semibold text-fg">{s.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-2 divide-y divide-line">
          <SettingRow title="Export your data" description="Download everything in your account as a JSON file.">
            <Button onClick={() => void download()}>
              <Download /> Download
            </Button>
          </SettingRow>
        </div>
      </SettingsSection>

      <SettingsSection id="session" title="Session">
        <SettingRow title="Sign out" description={session ? `Signed in as ${session.email}.` : undefined}>
          <Button
            onClick={async () => {
              await signOut();
              reset();
              toast.success("Signed out");
              router.push("/");
            }}
          >
            <LogOut /> Sign out
          </Button>
        </SettingRow>
      </SettingsSection>

      <SettingsSection id="delete" title="Delete account">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-weak/40 bg-weak-tint/40 p-4">
          <p className="m-0 max-w-[52ch] text-small text-fg-secondary">Deletes your account along with every idea, chat, note, setting and AI tool token, and signs you out. This can&apos;t be undone.</p>
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            <Trash2 /> Delete account
          </Button>
        </div>
      </SettingsSection>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete your account?"
        description="Your account and every idea, chat, interview note and setting are permanently deleted, and you're signed out. This can't be undone."
        confirmLabel="Delete account"
        onConfirm={async () => {
          try {
            await deleteAllData();
          } catch {
            toast.error("Couldn't delete your account. Try again.");
            return;
          }
          setConfirmDelete(false);
          reset();
          applyTheme("system");
          toast.success("Account deleted");
          router.push("/");
        }}
      />
    </div>
  );
}
