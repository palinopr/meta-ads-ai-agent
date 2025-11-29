import { AIAssistantWrapper } from "@/components/ai-assistant/AIAssistantWrapper";
import { DashboardLayoutClient } from "@/components/layout/DashboardLayoutClient";

/**
 * Dashboard layout - Server Component
 * Wraps children with client-side AI Assistant and Layout
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AIAssistantWrapper>
      <DashboardLayoutClient>
        {children}
      </DashboardLayoutClient>
    </AIAssistantWrapper>
  );
}
