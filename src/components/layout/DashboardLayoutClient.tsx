"use client";

import { useState, useEffect } from "react";
import { useAssistant } from "@/components/ai-assistant/AssistantProvider";
import { AIChat } from "@/components/ai-assistant/AIChat";
import { ModernSidebar } from "@/components/layout/ModernSidebar";
import { AdAccount } from "@/types";

const SIDEBAR_STORAGE_KEY = "sidebar-collapsed";

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  adAccounts: AdAccount[];
  currentAccountId?: string;
}

export function DashboardLayoutClient({ 
  children, 
  adAccounts, 
  currentAccountId 
}: DashboardLayoutClientProps) {
  const { isOpen } = useAssistant();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Load sidebar state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored !== null) {
      setSidebarCollapsed(stored === "true");
    }
  }, []);

  // Persist sidebar state to localStorage
  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(newState));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Left Sidebar - Navigation */}
      <ModernSidebar 
        adAccounts={adAccounts} 
        currentAccountId={currentAccountId}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex min-w-0 overflow-hidden">
        {/* Dashboard Content */}
        <main className={`flex-1 overflow-y-auto transition-all duration-300 ${isOpen ? 'max-w-[calc(100%-420px)]' : ''}`}>
          {children}
        </main>

        {/* AI Chat Panel - Always Visible */}
        <AIChat />
      </div>
    </div>
  );
}
