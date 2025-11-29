"use client";

import { useAssistant } from "./AssistantProvider";
import { Sparkles } from "lucide-react";
import { useEffect } from "react";

export function FloatingButton() {
  const { isOpen, toggle } = useAssistant();

  // Keyboard shortcut: Cmd+K or Ctrl+K to toggle (always active)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggle();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggle]);

  // Hide button when panel is open (but component stays mounted for ⌘K)
  if (isOpen) return null;

  return (
    <button
      onClick={toggle}
      className="
        fixed bottom-6 right-6 z-50
        flex items-center gap-2 px-4 py-2.5
        bg-secondary/80 backdrop-blur-sm
        border border-border/50
        rounded-lg shadow-lg
        text-sm text-muted-foreground
        hover:text-foreground hover:border-primary/30 hover:bg-secondary
        transition-all duration-200
        group
      "
      aria-label="Open AI assistant"
    >
      <Sparkles className="w-4 h-4 text-primary group-hover:text-primary" />
      <span className="hidden sm:inline">Ask AI</span>
      <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-background/50 rounded border border-border/50">
        <span className="text-[10px]">⌘</span>K
      </kbd>
    </button>
  );
}
