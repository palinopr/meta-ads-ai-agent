"use client";

interface QuickAction {
  id: string;
  label: string;
  prompt: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "stats",
    label: "How am I doing?",
    prompt: "How are my ads doing this week? Give me a quick summary.",
  },
  {
    id: "campaigns",
    label: "Show campaigns",
    prompt: "Show me all my campaigns and which ones are running.",
  },
  {
    id: "best",
    label: "Best performer",
    prompt: "Which of my ads is doing the best right now?",
  },
  {
    id: "create",
    label: "Create new ad",
    prompt: "Help me create a new ad. Walk me through it step by step.",
  },
  {
    id: "optimize",
    label: "Optimize",
    prompt: "Look at my campaigns and suggest ways to improve them.",
  },
  {
    id: "help",
    label: "What can you do?",
    prompt: "What can you help me with?",
  },
];

interface QuickActionsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export function QuickActions({ onSelect, disabled }: QuickActionsProps) {
  return (
    <div className="space-y-2">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        Suggestions
      </span>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => onSelect(action.prompt)}
            disabled={disabled}
            className="
              px-3 py-1.5 text-xs
              bg-secondary/50 hover:bg-secondary
              border border-border/30 hover:border-border/50
              rounded-md
              text-muted-foreground hover:text-foreground
              transition-all duration-150
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
