"use client";

import { useAssistant } from "@/components/ai-assistant/AssistantProvider";
import { ChatSidebar } from "@/components/ai-assistant/ChatSidebar";
import { PanelRightOpen } from "lucide-react";

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const { isOpen, open } = useAssistant();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header Toggle (Visible only when sidebar is closed) */}
        {!isOpen && (
          <button
            onClick={open}
            className="absolute top-4 right-6 z-10 p-2 bg-background border border-border rounded-md shadow-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
            title="Open Copilot"
          >
            <PanelRightOpen className="w-4 h-4" />
          </button>
        )}
        
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Sidebar */}
      <ChatSidebar />
    </div>
  );
}

