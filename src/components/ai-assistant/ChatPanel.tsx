"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAssistant } from "./AssistantProvider";
import { QuickActions } from "./QuickActions";
import { Send, Loader2, X, Sparkles } from "lucide-react";
import { toast } from "sonner";

export function ChatPanel() {
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
  const panelRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        close();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, close]);

  // Handle Escape key to close panel
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleSend = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    // Add user message
    addMessage({ role: "user", content: messageText.trim() });
    setInput("");
    setIsLoading(true);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    // Add placeholder for assistant response with streaming flag
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

      // Check for non-streaming error responses
      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          const data = await response.json();
          if (data.error === "No Meta connection found") {
            toast.error("Connect your Meta Ads first");
            updateMessage(assistantMessageId, "You need to connect your Meta Ads account first. Click 'Connect Account' on your dashboard.", false);
          } else if (data.error === "Token expired") {
            toast.error("Connection expired");
            updateMessage(assistantMessageId, "Your Meta Ads connection expired. Please reconnect from your dashboard.", false);
          } else if (response.status === 401) {
            window.location.href = "/login";
            return;
          } else {
            updateMessage(assistantMessageId, "Something went wrong. Try again?", false);
          }
          return;
        }
        updateMessage(assistantMessageId, "Something went wrong. Try again?", false);
        return;
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        updateMessage(assistantMessageId, "Failed to start streaming", false);
        return;
      }

      const decoder = new TextDecoder();
      let streamedContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Add new data to buffer
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete SSE messages (separated by \n\n)
        const messages = buffer.split("\n\n");
        // Keep the last potentially incomplete message in the buffer
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
                } else if (data.type === "error") {
                  updateMessage(assistantMessageId, data.value || "An error occurred", false);
                }
              } catch (e) {
                console.error("SSE parse error:", e, "line:", line);
              }
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        const lines = buffer.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const jsonStr = line.slice(6).trim();
              if (!jsonStr) continue;
              
              const data = JSON.parse(jsonStr);
              if (data.type === "text") {
                streamedContent += data.value;
              }
            } catch {
              // Ignore incomplete final chunks
            }
          }
        }
      }

      // Ensure streaming flag is cleared and content is set
      updateMessage(assistantMessageId, streamedContent || "No response received", false);
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        updateMessage(assistantMessageId, "Request cancelled", false);
        return;
      }
      console.error("Chat error:", error);
      updateMessage(assistantMessageId, "Can't connect right now. Check your internet.", false);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
      inputRef.current?.focus();
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Panel */}
      <div
        ref={panelRef}
        className="
          relative w-full max-w-2xl
          bg-background/95 backdrop-blur-xl
          border border-border/50
          rounded-xl shadow-2xl
          flex flex-col
          max-h-[80vh] sm:max-h-[600px]
          animate-in fade-in slide-in-from-bottom-4 duration-200
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">AI Assistant</span>
            <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-secondary/50 rounded">
              Meta Ads
            </span>
          </div>
          <button
            onClick={close}
            className="p-1 rounded hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px]">
          {messages.map((message) => (
            <div key={message.id} className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {message.role === "assistant" ? (
                  <>
                    <Sparkles className="w-3 h-3 text-primary" />
                    <span>AI</span>
                    {message.isStreaming && (
                      <span className="text-primary animate-pulse">●</span>
                    )}
                  </>
                ) : (
                  <span>You</span>
                )}
              </div>
              <div
                className={`
                  text-sm leading-relaxed whitespace-pre-wrap
                  ${message.role === "assistant" ? "text-foreground" : "text-muted-foreground"}
                `}
              >
                {message.content || (message.isStreaming ? (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Thinking...</span>
                  </span>
                ) : null)}
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions - only show at start */}
        {messages.length <= 1 && !isLoading && (
          <div className="px-4 pb-2">
            <QuickActions onSelect={handleSend} disabled={isLoading} />
          </div>
        )}

        {/* Input */}
        <div className="p-3 border-t border-border/50">
          <form onSubmit={handleSubmit} className="relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your ads..."
              disabled={isLoading}
              rows={1}
              className="
                w-full px-4 py-3 pr-12
                bg-secondary/30 border border-border/50
                rounded-lg resize-none
                text-sm placeholder:text-muted-foreground
                focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50
                disabled:opacity-50
              "
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="
                absolute right-2 top-1/2 -translate-y-1/2
                p-2 rounded-md
                text-muted-foreground hover:text-foreground
                disabled:opacity-30 disabled:cursor-not-allowed
                transition-colors
              "
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
          <div className="flex items-center justify-between mt-2 px-1">
            <span className="text-[10px] text-muted-foreground">
              Press Enter to send, Shift+Enter for new line
            </span>
            <span className="text-[10px] text-muted-foreground">
              Esc to close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
