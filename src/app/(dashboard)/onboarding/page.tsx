import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createMetaClient } from "@/lib/meta/client";
import { AccountSelector } from "@/components/onboarding/AccountSelector";
import { AdAccount } from "@/types";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check connection - use maybeSingle() to handle 0 rows gracefully
  const { data: metaConnection } = await supabase
    .from("meta_connections")
    .select("access_token, ad_account_id")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!metaConnection?.access_token) {
    // Not connected yet
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <div className="text-center max-w-md mx-auto space-y-6">
                <h1 className="text-2xl font-bold">Connect Meta Ads</h1>
                <p className="text-muted-foreground">
                    You need to connect your Facebook account to continue.
                </p>
                <a
                    href="/api/meta/connect"
                    className="inline-block px-6 py-3 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white font-medium rounded-lg transition-colors"
                >
                    Connect with Facebook
                </a>
            </div>
        </div>
    );
  }

  // Fetch ad accounts
  let adAccounts: AdAccount[] = [];
  try {
    const metaClient = createMetaClient(metaConnection.access_token);
    const result = await metaClient.getAdAccounts();
    adAccounts = result.data;
  } catch (error) {
    console.error("Error fetching ad accounts:", error);
    // Handle error (maybe token expired)
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <div className="text-center max-w-md mx-auto space-y-4">
                <h1 className="text-2xl font-bold text-red-500">Connection Error</h1>
                <p className="text-muted-foreground">
                    Could not fetch your ad accounts. Please try reconnecting.
                </p>
                <a
                    href="/api/meta/connect"
                    className="inline-block px-6 py-3 bg-secondary hover:bg-secondary/80 font-medium rounded-lg transition-colors"
                >
                    Reconnect
                </a>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6">
      <AccountSelector 
        adAccounts={adAccounts} 
        currentAccountId={metaConnection.ad_account_id} 
      />
    </div>
  );
}



