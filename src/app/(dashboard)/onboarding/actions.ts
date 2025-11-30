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

  // Get ALL connections for this user
  const { data: connections, error: fetchError } = await supabase
    .from("meta_connections")
    .select("id, access_token, token_expires_at, ad_account_id")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

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
  // We maintain ONE connection per user. The UNIQUE(user_id, ad_account_id) constraint
  // prevents duplicates. We need to handle the case where old connections might exist.
  
  // Step 1: Delete ALL other connections except the current one (cleanup duplicates)
  if (connections.length > 1) {
    const otherIds = connections.slice(1).map(c => c.id);
    await supabase
      .from("meta_connections")
      .delete()
      .in("id", otherIds);
  }

  // Step 2: Update the single remaining connection with new account details
  // This is safe because we only have one row for this user now
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
