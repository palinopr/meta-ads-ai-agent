import { createClient } from "@/lib/supabase/server";
import { createMetaClient } from "@/lib/meta/client";
import { redirect } from "next/navigation";
import { AIAssistantWrapper } from "@/components/ai-assistant/AIAssistantWrapper";
import { DashboardLayoutClient } from "@/components/layout/DashboardLayoutClient";
import { AdAccount } from "@/types";

// Force dynamic rendering to ensure fresh data on each request
export const dynamic = "force-dynamic";

/**
 * Dashboard layout - Server Component
 * Wraps children with client-side AI Assistant and Layout
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user = null;
  let metaConnection = null;
  let adAccounts: AdAccount[] = [];

  try {
    const supabase = await createClient();
    const { data: userData, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error("Auth error in layout:", authError);
      redirect("/login");
    }
    
    user = userData?.user;
    
    if (!user) {
      redirect("/login");
    }

    const { data: connectionData, error: connectionError } = await supabase
      .from("meta_connections")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (connectionError && connectionError.code !== "PGRST116") {
      // PGRST116 means no rows found, which is ok
      console.error("Connection fetch error:", connectionError);
    }
    
    metaConnection = connectionData;

    if (metaConnection?.access_token) {
      try {
        const metaClient = createMetaClient(metaConnection.access_token);
        const result = await metaClient.getAdAccounts();
        adAccounts = result?.data || [];
      } catch (e) {
        console.error("Error fetching ad accounts for layout:", e);
        // Return empty array instead of crashing
        adAccounts = [];
      }
    }
  } catch (e) {
    console.error("Layout error:", e);
    // Don't throw, just render with empty data
  }

  return (
    <AIAssistantWrapper>
      <DashboardLayoutClient 
        adAccounts={adAccounts} 
        currentAccountId={metaConnection?.ad_account_id || undefined}
      >
        {children}
      </DashboardLayoutClient>
    </AIAssistantWrapper>
  );
}
