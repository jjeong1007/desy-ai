"use client";
import { ArrowUpRight, BookOpen, FlaskConical, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Accordion } from "@/components/marketing/parts";
import { SettingsHeader, SettingsSection } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { Label, Select, Textarea } from "@/components/ui/field";
import { Kbd } from "@/components/ui/inputs";
import { FAQ } from "@/config/faq";

const GUIDES: { title: string; body: string; href: string; icon: ReactNode }[] = [
  { title: "How scoring works", body: "What goes into a Desy Score and a pursuit band.", href: "/#scoring", icon: <BookOpen /> },
  { title: "Plan customer interviews", body: "Turn open assumptions into a script or a pitch.", href: "/app/planner", icon: <FlaskConical /> },
  { title: "Ask Desy", body: "Questions about your ideas, answered from your workspace.", href: "/app/chat", icon: <MessageCircle /> },
];

const SHORTCUTS: { keys: string[]; action: string }[] = [
  { keys: ["⌘", "K"], action: "Search and switch ideas" },
  { keys: ["Enter"], action: "Send a prompt" },
  { keys: ["Shift", "Enter"], action: "New line in a prompt" },
  { keys: ["Esc"], action: "Close a dialog or menu" },
];

const TOPICS = ["Something isn't working", "Feature request", "Question about my score", "Other"];

export function SupportSettings() {
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState("");

  return (
    <div>
      <SettingsHeader title="Support" description="Guides, answers to common questions, and a way to reach us." />

      <SettingsSection id="guides" title="Guides">
        <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-3">
          {GUIDES.map((g) => (
            <li key={g.title}>
              <Link href={g.href} className="group flex h-full flex-col gap-2 rounded-lg border border-line p-4 transition-colors hover:border-line-strong hover:bg-muted">
                <span className="flex items-center justify-between text-fg-brand [&_svg]:size-4">
                  {g.icon}
                  <ArrowUpRight className="text-fg-tertiary transition-colors group-hover:text-fg" aria-hidden />
                </span>
                <span className="text-body font-medium text-fg">{g.title}</span>
                <span className="text-small text-fg-secondary">{g.body}</span>
              </Link>
            </li>
          ))}
        </ul>
      </SettingsSection>

      <SettingsSection id="faq" title="Frequently asked questions">
        <Accordion items={FAQ} defaultOpen={null} />
      </SettingsSection>

      <SettingsSection id="feedback" title="Send feedback" description="Tell us what's broken, confusing, or missing.">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (message.trim().length < 5) {
              toast.error("Add a few words so we know what happened.");
              return;
            }
            toast.success("Thanks. This demo keeps feedback on your machine and doesn't send it.");
            setMessage("");
          }}
        >
          <div>
            <Label htmlFor="fb-topic" className="block">Topic</Label>
            <Select id="fb-topic" className="mt-1.5" value={topic} onChange={(e) => setTopic(e.target.value)}>
              {TOPICS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="fb-message" className="block">Message</Label>
            <Textarea id="fb-message" className="mt-1.5 min-h-[120px]" placeholder="What were you trying to do, and what happened?" value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <Button type="submit" variant="primary" className="self-start">
            Send feedback
          </Button>
        </form>
      </SettingsSection>

      <SettingsSection id="shortcuts" title="Keyboard shortcuts">
        <dl className="m-0 flex flex-col divide-y divide-line rounded-lg border border-line">
          {SHORTCUTS.map((s) => (
            <div key={s.action} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <dt className="text-body text-fg">{s.action}</dt>
              <dd className="m-0 flex items-center gap-1">
                {s.keys.map((k) => (
                  <Kbd key={k} className="h-5 w-auto min-w-5 px-1.5 text-caption">
                    {k}
                  </Kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </SettingsSection>
    </div>
  );
}
