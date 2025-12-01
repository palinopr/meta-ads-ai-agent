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

    // Single Active Connection model:
    // We maintain ONE connection per user. The UNIQUE(user_id, ad_account_id) constraint
    // prevents duplicates. We need to handle the case where old connections might exist.

    // Step 1: Delete ALL other connections for this user (keeps only the most recent one)
    if (connections && connections.length > 1) {
      const otherIds = connections.slice(1).map(c => c.id);
      console.log("[updateActiveAdAccount] Step 1: Deleting other connections:", otherIds);
      const { error: deleteError } = await supabase
        .from("meta_connections")
        .delete()
        .in("id", otherIds);

      if (deleteError) {
        console.error("[updateActiveAdAccount] Step 1 delete error:", deleteError);
        // Continue anyway - not critical
      }
    }

    // Step 2: Check for any existing row with the TARGET ad_account_id (could be from another query)
    // Do a fresh query to ensure we catch any rows not in our original result
    console.log("[updateActiveAdAccount] Step 2: Checking for existing target:", adAccountId);
    const { data: existingWithTarget, error: checkError } = await supabase
      .from("meta_connections")
      .select("id")
      .eq("user_id", user.id)
      .eq("ad_account_id", adAccountId)
      .neq("id", currentConnection.id);

    if (checkError) {
      console.error("[updateActiveAdAccount] Step 2 check error:", checkError);
      // Continue anyway - we'll get a constraint error if there's a conflict
    }

    if (existingWithTarget && existingWithTarget.length > 0) {
      console.log("[updateActiveAdAccount] Step 2: Found conflicting rows:", existingWithTarget);
      const conflictIds = existingWithTarget.map(r => r.id);
      const { error: deleteConflictError } = await supabase
        .from("meta_connections")
        .delete()
        .in("id", conflictIds);

      if (deleteConflictError) {
        console.error("[updateActiveAdAccount] Step 2 delete error:", deleteConflictError);
        return { success: false, error: "Failed to clean up duplicate connections: " + deleteConflictError.message };
      }
    }

    // Step 3: Update the single remaining connection with new account details
    console.log("[updateActiveAdAccount] Step 3: Updating connection", currentConnection.id);
    const { error: updateError } = await supabase
      .from("meta_connections")
      .update({
        ad_account_id: adAccountId,
        ad_account_name: adAccountName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", currentConnection.id);

    if (updateError) {
      console.error("[updateActiveAdAccount] Step 3 update error:", updateError);
      return { success: false, error: "Failed to switch account: " + updateError.message };
    }

    console.log("[updateActiveAdAccount] Success!");

    // NOTE: We removed revalidatePath() here because it was causing race conditions
    // with client-side router.refresh(). The client handles the refresh.

    return { success: true };
  } catch (error) {
    console.error("[updateActiveAdAccount] Unexpected error:", error);
    console.error("[updateActiveAdAccount] Error stack:", error instanceof Error ? error.stack : "No stack");
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return { success: false, error: errorMessage };
  }
}
