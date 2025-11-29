import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { signOut } from "@/app/(auth)/login/actions";
import { createMetaClient } from "@/lib/meta/client";
import { DollarSign, TrendingUp, BarChart3, Zap, AlertCircle, CheckCircle2 } from "lucide-react";

// Helper to format currency
function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return `$${amount.toFixed(0)}`;
}

// Helper to format large numbers
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toFixed(0);
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user has a Meta Ads connection
  const { data: metaConnection } = await supabase
    .from("meta_connections")
    .select("ad_account_id, ad_account_name, access_token, token_expires_at")
    .eq("user_id", user.id)
    .single();

  const isMetaConnected = !!metaConnection;
  const isTokenExpired = metaConnection?.token_expires_at 
    ? new Date(metaConnection.token_expires_at) < new Date() 
    : false;

  // Fetch real stats if connected
  const stats = {
    spend: 0,
    impressions: 0,
    clicks: 0,
    roas: 0,
    activeCampaigns: 0,
    totalCampaigns: 0,
  };
  let campaigns: Array<{
    id: string;
    name: string;
    status: string;
    daily_budget?: string;
  }> = [];
  let fetchError: string | null = null;

  if (isMetaConnected && !isTokenExpired && metaConnection?.access_token) {
    try {
      const metaClient = createMetaClient(metaConnection.access_token);
      const accountId = `act_${metaConnection.ad_account_id}`;

      // Fetch campaigns
      const campaignsResult = await metaClient.getCampaigns(accountId);
      campaigns = campaignsResult.data || [];
      
      stats.totalCampaigns = campaigns.length;
      stats.activeCampaigns = campaigns.filter(c => c.status === "ACTIVE").length;

      // Fetch insights for last 7 days
      try {
        const insightsResult = await metaClient.getAccountInsights(accountId, {
          date_preset: "last_7d",
        });
        
        const insights = insightsResult.data?.[0];
        if (insights) {
          stats.spend = parseFloat(insights.spend || "0");
          stats.impressions = parseInt(insights.impressions || "0", 10);
          stats.clicks = parseInt(insights.clicks || "0", 10);
          
          // Calculate ROAS if available
          const roasData = insights.purchase_roas?.[0];
          if (roasData?.value) {
            stats.roas = parseFloat(roasData.value);
          }
        }
      } catch (insightsError) {
        console.log("Could not fetch insights:", insightsError);
        // Non-critical - continue without insights
      }
    } catch (error) {
      console.error("Error fetching Meta data:", error);
      fetchError = error instanceof Error ? error.message : "Could not load your data";
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-bold text-primary">
            Meta Ads AI
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Welcome */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-1">
              {isMetaConnected && !isTokenExpired ? "Your Ad Performance" : "Welcome!"}
            </h1>
            <p className="text-muted-foreground">
              {isMetaConnected && !isTokenExpired
                ? `Connected to: ${metaConnection?.ad_account_name || "Your account"}`
                : "Connect your Meta Ads account to see your stats."}
            </p>
          </div>

          {/* Connection Status Card */}
          {(!isMetaConnected || isTokenExpired) && (
            <div className="p-6 rounded-2xl bg-secondary/50 border border-border mb-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#1877F2]/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">
                    {isTokenExpired ? "Reconnect Your Account" : "Connect Meta Ads"}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {isTokenExpired
                      ? "Your connection expired. Please reconnect to see your stats."
                      : "Link your Meta Ads account to see performance and manage campaigns with AI."}
                  </p>
                  <a
                    href="/api/meta/connect"
                    className="inline-block px-4 py-2 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white font-medium rounded-lg text-sm transition-colors"
                  >
                    {isTokenExpired ? "Reconnect Account" : "Connect Account"}
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {fetchError && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 mb-8 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-400">{fetchError}</p>
            </div>
          )}

          {/* Stats Cards - Only show when connected */}
          {isMetaConnected && !isTokenExpired && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {/* Spend */}
                <div className="p-5 rounded-2xl bg-secondary/30 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-green-500" />
                    </div>
                    <span className="text-xs text-muted-foreground">Spent (7d)</span>
                  </div>
                  <div className="text-2xl font-bold text-green-500">
                    {stats.spend > 0 ? formatCurrency(stats.spend) : "--"}
                  </div>
                  {stats.spend > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
                  )}
                </div>

                {/* Impressions */}
                <div className="p-5 rounded-2xl bg-secondary/30 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-blue-500" />
                    </div>
                    <span className="text-xs text-muted-foreground">Views</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {stats.impressions > 0 ? formatNumber(stats.impressions) : "--"}
                  </div>
                  {stats.impressions > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">People saw your ads</p>
                  )}
                </div>

                {/* Clicks */}
                <div className="p-5 rounded-2xl bg-secondary/30 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-purple-500" />
                    </div>
                    <span className="text-xs text-muted-foreground">Clicks</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {stats.clicks > 0 ? formatNumber(stats.clicks) : "--"}
                  </div>
                  {stats.clicks > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">People clicked</p>
                  )}
                </div>

                {/* ROAS or Active Campaigns */}
                <div className="p-5 rounded-2xl bg-secondary/30 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-orange-500" />
                    </div>
                    <span className="text-xs text-muted-foreground">Active Ads</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {stats.activeCampaigns > 0 ? stats.activeCampaigns : "--"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    of {stats.totalCampaigns} campaigns
                  </p>
                </div>
              </div>

              {/* Campaign List */}
              {campaigns.length > 0 && (
                <div className="rounded-2xl bg-secondary/20 border border-border overflow-hidden">
                  <div className="px-5 py-4 border-b border-border">
                    <h3 className="font-semibold">Your Campaigns</h3>
                    <p className="text-xs text-muted-foreground">Click the AI button to manage them</p>
                  </div>
                  <div className="divide-y divide-border">
                    {campaigns.slice(0, 5).map((campaign) => (
                      <div key={campaign.id} className="px-5 py-4 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            campaign.status === "ACTIVE" ? "bg-green-500" : "bg-muted-foreground"
                          }`} />
                          <div>
                            <p className="font-medium text-sm">{campaign.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {campaign.status === "ACTIVE" ? "Running" : campaign.status.toLowerCase()}
                            </p>
                          </div>
                        </div>
                        {campaign.daily_budget && (
                          <span className="text-sm text-muted-foreground">
                            {formatCurrency(parseInt(campaign.daily_budget) / 100)}/day
                          </span>
                        )}
                      </div>
                    ))}
                    {campaigns.length > 5 && (
                      <div className="px-5 py-3 text-center">
                        <p className="text-sm text-muted-foreground">
                          + {campaigns.length - 5} more campaigns
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* No Campaigns Yet */}
              {campaigns.length === 0 && !fetchError && (
                <div className="p-8 rounded-2xl bg-secondary/20 border border-border text-center">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">No campaigns yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Click the AI button in the corner to create your first campaign!
                  </p>
                </div>
              )}
            </>
          )}

          {/* Help Tip */}
          <div className="mt-8 p-4 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Need help?</p>
                <p className="text-sm text-muted-foreground">
                  Click the AI button in the bottom right corner to ask questions or manage your ads!
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
