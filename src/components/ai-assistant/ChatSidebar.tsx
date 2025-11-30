"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAssistant } from "./AssistantProvider";
import { QuickActions } from "./QuickActions";
import { Send, Loader2, Sparkles, PanelRightClose } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChatSidebar() {
  const {
    isOpen,
    close,
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

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
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

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let streamedContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const messages = buffer.split("\n\n");
        buffer = messages.pop() || "";

        for (const message of messages) {
          const lines = message.split("\n");
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
                } else if (data.type === "done") {
                  updateMessage(assistantMessageId, streamedContent, false);
                }
              } catch (e) {
                console.error("SSE parse error:", e);
              }
            }
          }
        }
      }

      updateMessage(assistantMessageId, streamedContent || "I'm ready to help.", false);
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

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full border-l border-border bg-secondary/10 w-[400px] flex-shrink-0 transition-all duration-300 ease-in-out">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/50 backdrop-blur supports-[backdrop-filter]:bg-background/50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Copilot</span>
        </div>
        <button onClick={close} className="text-muted-foreground hover:text-foreground p-1 hover:bg-secondary rounded">
          <PanelRightClose className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-background/30">
        {messages.map((message) => (
          <div key={message.id} className="group">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={cn(
                "text-xs font-medium uppercase tracking-wider",
                message.role === "assistant" ? "text-primary" : "text-muted-foreground"
              )}>
                {message.role === "assistant" ? "AI Agent" : "You"}
              </span>
            </div>
            <div className={cn(
              "text-sm leading-relaxed whitespace-pre-wrap",
              message.role === "assistant" ? "text-foreground" : "text-muted-foreground"
            )}>
              {message.content || (message.isStreaming && <span className="animate-pulse">Thinking...</span>)}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-background">
        {messages.length <= 1 && !isLoading && (
            <div className="mb-4">
                <QuickActions onSelect={handleSend} disabled={isLoading} />
            </div>
        )}
        
        <div className="relative">
          <form onSubmit={handleSubmit}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask AI to create a campaign..."
              className="w-full bg-secondary/20 border border-border rounded-lg px-3 py-2.5 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
              disabled={isLoading}
            />
            <div className="absolute bottom-2 right-2 flex items-center gap-2">
                <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="p-1.5 bg-primary text-primary-foreground rounded-md disabled:opacity-50 hover:bg-primary/90 transition-colors"
                >
                    {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                </button>
            </div>
          </form>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          AI can make mistakes. Please verify important info.
        </p>
      </div>
    </div>
  );
}



