"use client";

import { FloatingButton } from "./FloatingButton";
import { ChatPanel } from "./ChatPanel";

export { AssistantProvider, useAssistant } from "./AssistantProvider";
export { FloatingButton } from "./FloatingButton";
export { ChatPanel } from "./ChatPanel";
export { QuickActions } from "./QuickActions";
export { AIAssistantWrapper } from "./AIAssistantWrapper";

/**
 * Complete AI Assistant widget - includes the floating button and chat panel.
 * Wrap your app with AssistantProvider, then add this component.
 */
export function AIAssistant() {
  return (
    <>
      <FloatingButton />
      <ChatPanel />
    </>
  );
}
