"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface AssistantContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  messages: Message[];
  addMessage: (message: Omit<Message, "id" | "timestamp">) => string;
  updateMessage: (id: string, content: string, isStreaming?: boolean) => void;
  clearMessages: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  conversationId: string | null;
  setConversationId: (id: string | null) => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

const INITIAL_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: "Hey! 👋 I'm here to help you with your Facebook and Instagram ads. You can ask me anything - like \"how are my ads doing?\" or \"show me my campaigns\". What would you like to know?",
  timestamp: new Date(),
};

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState("dashboard");

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  const addMessage = useCallback((message: Omit<Message, "id" | "timestamp">): string => {
    const id = Date.now().toString();
    const newMessage: Message = {
      ...message,
      id,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
    return id;
  }, []);

  const updateMessage = useCallback((id: string, content: string, isStreaming?: boolean) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === id
          ? { ...msg, content, isStreaming: isStreaming ?? msg.isStreaming }
          : msg
      )
    );
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([INITIAL_MESSAGE]);
    setConversationId(null);
  }, []);

  return (
    <AssistantContext.Provider
      value={{
        isOpen,
        open,
        close,
        toggle,
        messages,
        addMessage,
        updateMessage,
        clearMessages,
        isLoading,
        setIsLoading,
        conversationId,
        setConversationId,
        currentPage,
        setCurrentPage,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistant() {
  const context = useContext(AssistantContext);
  if (context === undefined) {
    throw new Error("useAssistant must be used within an AssistantProvider");
  }
  return context;
}
