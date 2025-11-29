"use client";

import { AssistantProvider } from "./AssistantProvider";
import { FloatingButton } from "./FloatingButton";
import { ChatPanel } from "./ChatPanel";

/**
 * Client-side wrapper for AI Assistant components.
 * This allows the dashboard layout to remain a Server Component
 * while providing client-side AI functionality.
 */
export function AIAssistantWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AssistantProvider>
      {children}
      <FloatingButton />
      <ChatPanel />
    </AssistantProvider>
  );
}

