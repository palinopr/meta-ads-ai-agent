"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateActiveAdAccount(
  adAccountId: string, 
  adAccountName: string,
  businessId?: string,
  businessName?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  // Get the current connection for this user
  const { data: connections, error: fetchError } = await supabase
    .from("meta_connections")
    .select("id, access_token, token_expires_at, ad_account_id")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (fetchError) {
    console.error("Error fetching connections:", fetchError);
    throw new Error("Failed to fetch connections");
  }

  if (!connections || connections.length === 0) {
    throw new Error("No Meta connection found. Please reconnect your Meta account.");
  }

  const currentConnection = connections[0];
  
  // If user already has this account selected, just return success
  if (currentConnection.ad_account_id === adAccountId) {
    return { success: true };
  }

  // Single Active Connection model:
  // Update the existing connection row with the new ad_account details.
  // First, we need to handle the UNIQUE(user_id, ad_account_id) constraint.
  // Since we maintain only ONE connection per user, we can safely update.
  
  // Step 1: Delete any potential duplicate connections (cleanup from old bugs)
  // Keep only the most recent one
  const { error: cleanupError } = await supabase
    .from("meta_connections")
    .delete()
    .eq("user_id", user.id)
    .neq("id", currentConnection.id);

  if (cleanupError) {
    console.error("Error cleaning up duplicate connections:", cleanupError);
    // Non-fatal, continue with update
  }

  // Step 2: Update the single connection with new account details
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
    console.error("Error updating connection:", updateError);
    throw new Error("Failed to switch account: " + updateError.message);
  }

  try {
    revalidatePath("/dashboard", "layout");
  } catch (e) {
    console.error("Revalidate failed", e);
  }
  
  return { success: true };
}
