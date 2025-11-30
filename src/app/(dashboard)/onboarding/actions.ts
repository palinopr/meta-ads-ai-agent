"use server";

import { createClient } from "@/lib/supabase/server";

export async function updateActiveAdAccount(
  adAccountId: string,
  adAccountName: string,
  businessId?: string,
  businessName?: string
): Promise<{ success: boolean; error?: string }> {
  console.log("[updateActiveAdAccount] Starting with:", { adAccountId, adAccountName, businessId, businessName });

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error("[updateActiveAdAccount] Auth error:", authError);
      return { success: false, error: "Authentication error: " + authError.message };
    }

    if (!user) {
      console.error("[updateActiveAdAccount] No user found");
      return { success: false, error: "Not authenticated" };
    }

    console.log("[updateActiveAdAccount] User ID:", user.id);

    // Get ALL connections for this user
    const { data: connections, error: fetchError } = await supabase
      .from("meta_connections")
      .select("id, access_token, token_expires_at, ad_account_id")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (fetchError) {
      console.error("[updateActiveAdAccount] Fetch error:", fetchError);
      return { success: false, error: "Failed to fetch connections: " + fetchError.message };
    }

    console.log("[updateActiveAdAccount] Found connections:", connections?.length || 0);

    const currentConnection = connections?.[0];

    if (!currentConnection) {
      console.error("[updateActiveAdAccount] No connection found");
      return { success: false, error: "No Meta connection found. Please reconnect your Meta account." };
    }

    console.log("[updateActiveAdAccount] Current connection:", {
      id: currentConnection.id,
      ad_account_id: currentConnection.ad_account_id
    });

    // If user already has this account selected, just return success
    if (currentConnection.ad_account_id === adAccountId) {
      console.log("[updateActiveAdAccount] Already on this account, returning success");
      return { success: true };
    }

    // Delete ALL other connections for this user (keeps only the most recent one)
    if (connections && connections.length > 1) {
      const otherIds = connections.slice(1).map(c => c.id);
      console.log("[updateActiveAdAccount] Deleting other connections:", otherIds);
      const { error: deleteError } = await supabase
        .from("meta_connections")
        .delete()
        .in("id", otherIds);

      if (deleteError) {
        console.error("[updateActiveAdAccount] Delete error:", deleteError);
      }
    }

    // Check for conflicting rows with the target ad_account_id
    const { data: existingWithTarget, error: checkError } = await supabase
      .from("meta_connections")
      .select("id")
      .eq("user_id", user.id)
      .eq("ad_account_id", adAccountId)
      .neq("id", currentConnection.id);

    if (checkError) {
      console.error("[updateActiveAdAccount] Check error:", checkError);
    }

    if (existingWithTarget && existingWithTarget.length > 0) {
      const conflictIds = existingWithTarget.map(r => r.id);
      const { error: deleteConflictError } = await supabase
        .from("meta_connections")
        .delete()
        .in("id", conflictIds);

      if (deleteConflictError) {
        console.error("[updateActiveAdAccount] Delete conflict error:", deleteConflictError);
        return { success: false, error: "Failed to clean up duplicate connections: " + deleteConflictError.message };
      }
    }

    // Update the connection with new account details
    console.log("[updateActiveAdAccount] Updating connection", currentConnection.id);
    const { error: updateError } = await supabase
      .from("meta_connections")
      .update({
        ad_account_id: adAccountId,
        ad_account_name: adAccountName,
        business_id: businessId || null,
        business_name: businessName || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", currentConnection.id);

    if (updateError) {
      console.error("[updateActiveAdAccount] Update error:", updateError);
      return { success: false, error: "Failed to switch account: " + updateError.message };
    }

    console.log("[updateActiveAdAccount] Success!");
    return { success: true };
  } catch (error) {
    console.error("[updateActiveAdAccount] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return { success: false, error: errorMessage };
  }
}
