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

  // Single Active Connection model:
  // We keep ONE connection per user and update which ad_account it points to.
  // The UNIQUE(user_id, ad_account_id) constraint means we can't have duplicates.
  
  // Step 1: Get the primary connection to preserve credentials
  const primaryConnection = connections[0];
  if (!primaryConnection) {
    throw new Error("No Meta connection found. Please reconnect your Meta account.");
  }
  
  const accessToken = primaryConnection.access_token;
  const tokenExpiresAt = primaryConnection.token_expires_at;
  
  // Step 2: Delete all existing connections for this user
  const { error: deleteError } = await supabase
    .from("meta_connections")
    .delete()
    .eq("user_id", user.id);

  if (deleteError) {
    console.error("Error deleting old connections:", deleteError);
    throw new Error("Failed to update account: " + deleteError.message);
  }

  // Step 3: Insert fresh connection with the new ad_account_id
  const { error: insertError } = await supabase
    .from("meta_connections")
    .insert({
      user_id: user.id,
      access_token: accessToken,
      token_expires_at: tokenExpiresAt,
      ad_account_id: adAccountId,
      ad_account_name: adAccountName,
      business_id: businessId || null,
      business_name: businessName || null,
    });

  if (insertError) {
    console.error("Error inserting new connection:", insertError);
    throw new Error("Failed to switch account: " + insertError.message);
  }

  try {
    revalidatePath("/dashboard", "layout");
  } catch (e) {
    console.error("Revalidate failed", e);
  }
  
  return { success: true };
}
