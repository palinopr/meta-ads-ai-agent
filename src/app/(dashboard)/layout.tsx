import { AIAssistantWrapper } from "@/components/ai-assistant/AIAssistantWrapper";

/**
 * Dashboard layout - Server Component
 * Wraps children with client-side AI Assistant
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AIAssistantWrapper>{children}</AIAssistantWrapper>;
}
