import type { Metadata } from "next";
import { ChatThreadView } from "@/components/chat/chat";

export const metadata: Metadata = { title: "Chat" };

export default function ChatThreadPage() {
  return <ChatThreadView />;
}
