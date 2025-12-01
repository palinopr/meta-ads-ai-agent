"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAssistant } from "./AssistantProvider";
import { 
  Send, 
  Loader2, 
  Sparkles, 
  MessageCircle, 
  Zap, 
  TrendingUp, 
  Target,
  ChevronRight,
  Bot,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";

const QUICK_PROMPTS = [
  { icon: TrendingUp, label: "Performance", prompt: "How are my campaigns performing this week?" },
  { icon: Zap, label: "Optimize", prompt: "What campaigns should I optimize for better ROI?" },
  { icon: Target, label: "Create", prompt: "Help me create a new campaign" },
  { icon: MessageCircle, label: "Insights", prompt: "Give me actionable insights from my ad data" },
];

const GREETING_SUGGESTIONS = [
  "Show me my top performing campaigns",
  "What's my total spend this month?",
  "Pause underperforming ads",
  "Create a new conversion campaign",
];

export function AIChat() {
  const {
    isOpen,
    messages,
    addMessage,
    updateMessage,
    isLoading,
    setIsLoading,
    conversationId,
    setConversationId,
  } = useAssistant();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  const handleSend = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    addMessage({ role: "user", content: messageText.trim() });
    setInput("");
    setIsLoading(true);

    abortControllerRef.current = new AbortController();
    const assistantMessageId = addMessage({ 
      role: "assistant", 
      content: "",
      isStreaming: true 
    });

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText.trim(),
          conversationId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error("Network response was not ok");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let streamedContent = "";
      let buffer = "";
      let hasFinalized = false; // Track if we've already finalized the message

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const sseMessages = buffer.split("\n\n");
        buffer = sseMessages.pop() || "";

        for (const sseMessage of sseMessages) {
          const lines = sseMessage.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const jsonStr = line.slice(6).trim();
                if (!jsonStr) continue;
                
                const data = JSON.parse(jsonStr);
                
                if (data.type === "conversationId") {
                  setConversationId(data.value);
                } else if (data.type === "text") {
                  streamedContent += data.value;
                  updateMessage(assistantMessageId, streamedContent, true);
                } else if (data.type === "done" && !hasFinalized) {
                  hasFinalized = true;
                  updateMessage(assistantMessageId, streamedContent, false);
                }
              } catch (e) {
                console.error("SSE parse error:", e);
              }
            }
          }
        }
      }

      // Only finalize if not already done (e.g., stream ended without "done" event)
      if (!hasFinalized) {
        updateMessage(assistantMessageId, streamedContent || "I'm ready to help with your Meta Ads!", false);
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        updateMessage(assistantMessageId, "Sorry, I encountered an error. Please try again.", false);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [addMessage, updateMessage, conversationId, isLoading, setConversationId, setIsLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  const hasMessages = messages.length > 1; // More than just the greeting

  if (!isOpen) return null;

  return (
    <div className="w-[420px] flex-shrink-0 border-l border-border flex flex-col bg-gradient-to-br from-background via-background to-accent/5 relative overflow-hidden">
      {/* Decorative gradient orbs */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-0 w-48 h-48 bg-chart-3/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Header */}
      <div className="relative z-10 px-5 py-4 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-chart-3 flex items-center justify-center ai-glow-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold flex items-center gap-2">
              AI Assistant
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                GPT-4
              </span>
            </h2>
            <p className="text-xs text-muted-foreground">Your Meta Ads co-pilot</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto relative z-10">
        {!hasMessages ? (
          /* Welcome State */
          <div className="h-full flex flex-col p-5">
            {/* Hero Section */}
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-chart-3/20 mb-4 ai-glow-sm">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Hey there! 👋</h3>
              <p className="text-sm text-muted-foreground max-w-[280px] mx-auto">
                I can help you manage campaigns, analyze performance, and optimize your Meta Ads.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="mt-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-1">
                Quick Actions
              </p>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt.label}
                    onClick={() => handleSend(prompt.prompt)}
                    disabled={isLoading}
                    className="group flex flex-col items-start gap-2 p-3 rounded-xl border border-border/50 bg-background/50 hover:bg-accent/50 hover:border-primary/30 transition-all text-left disabled:opacity-50"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <prompt.icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-xs font-medium">{prompt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Suggestions */}
            <div className="mt-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-1">
                Try saying...
              </p>
              <div className="space-y-2">
                {GREETING_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSend(suggestion)}
                    disabled={isLoading}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-left text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors disabled:opacity-50"
                  >
                    <ChevronRight className="w-3 h-3 text-primary shrink-0" />
                    <span>{suggestion}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Chat Messages */
          <div className="p-4 space-y-4">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={cn(
                  "flex gap-3",
                  message.role === "user" && "flex-row-reverse"
                )}
              >
                {/* Avatar */}
                <div className={cn(
                  "w-8 h-8 rounded-lg shrink-0 flex items-center justify-center",
                  message.role === "assistant" 
                    ? "bg-gradient-to-br from-primary to-chart-3 text-white" 
                    : "bg-secondary text-secondary-foreground"
                )}>
                  {message.role === "assistant" ? (
                    <Sparkles className="w-4 h-4" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>

                {/* Message Bubble */}
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5",
                  message.role === "assistant" 
                    ? "bg-secondary/50 rounded-tl-sm" 
                    : "bg-primary text-primary-foreground rounded-tr-sm"
                )}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content || (
                      message.isStreaming && (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-current typing-dot" />
                          <span className="w-1.5 h-1.5 rounded-full bg-current typing-dot" />
                          <span className="w-1.5 h-1.5 rounded-full bg-current typing-dot" />
                        </span>
                      )
                    )}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="relative z-10 p-4 border-t border-border/50 bg-background/80 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about your ads..."
            className="w-full bg-secondary/30 border border-border/50 rounded-xl px-4 py-3 pr-12 text-sm min-h-[52px] max-h-[120px] resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 placeholder:text-muted-foreground/70 transition-all"
            disabled={isLoading}
            rows={1}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={cn(
              "absolute bottom-2.5 right-2.5 p-2 rounded-lg transition-all",
              input.trim() && !isLoading
                ? "bg-primary text-primary-foreground hover:bg-primary/90 ai-glow-sm"
                : "bg-secondary text-muted-foreground"
            )}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
        <p className="text-[10px] text-muted-foreground/60 text-center mt-2">
          AI may make mistakes. Always verify important actions.
        </p>
      </div>
    </div>
  );
}


