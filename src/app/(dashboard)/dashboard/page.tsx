import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createMetaClient } from "@/lib/meta/client";
import { MetaAdsTable, type CampaignRow } from "@/components/dashboard/MetaAdsTable";

// Force dynamic rendering to ensure fresh data on each request
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let campaigns: CampaignRow[] = [];
  let accessToken = "";
  let accountId = "";
  let accountName = "Ad Account";
  
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      redirect("/login");
    }

    // Use maybeSingle() to gracefully handle 0 rows during account switching
    const { data: metaConnection, error: connectionError } = await supabase
      .from("meta_connections")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (connectionError) {
      console.error("Connection error:", connectionError);
    }

    if (metaConnection?.access_token && metaConnection?.ad_account_id) {
      accessToken = metaConnection.access_token;
      accountName = metaConnection.business_name || metaConnection.ad_account_name || "Ad Account";
      
      try {
        const metaClient = createMetaClient(metaConnection.access_token);
        // Ensure account ID has act_ prefix
        const rawAccountId = metaConnection.ad_account_id;
        accountId = rawAccountId.startsWith("act_") ? rawAccountId : `act_${rawAccountId}`;

        const [campaignsResult, campaignInsightsResult] = await Promise.allSettled([
          metaClient.getCampaigns(accountId),
          metaClient.getAccountInsights(accountId, { date_preset: "last_7d", level: "campaign" })
        ]);

        if (campaignsResult.status === "fulfilled") {
          campaigns = (campaignsResult.value?.data || []) as CampaignRow[];
        } else {
          console.error("Error fetching campaigns:", campaignsResult.reason);
        }

        // Merge campaign insights into campaigns
        if (campaignInsightsResult.status === "fulfilled") {
          const campaignInsights = campaignInsightsResult.value?.data || [];
          // Create a map of campaign_id to insights
          const insightsMap = new Map<string, { 
            spend: string; 
            impressions: string; 
            clicks: string; 
            cpm: string; 
            cpc: string; 
            ctr: string; 
            reach: string;
            frequency: string;
            results: string;
            purchase_value: string;
            cost_per_conversion: string;
          }>();
          for (const insight of campaignInsights) {
            const campaignId = (insight as { campaign_id?: string }).campaign_id;
            if (campaignId) {
              // Extract purchase count from actions array
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const actions = (insight as any).actions || [];
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const actionValues = (insight as any).action_values || [];
              
              // Find purchase action (could be "purchase", "omni_purchase", or "offsite_conversion.fb_pixel_purchase")
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const purchaseAction = actions.find((a: any) => 
                a.action_type === "purchase" || 
                a.action_type === "omni_purchase" ||
                a.action_type === "offsite_conversion.fb_pixel_purchase"
              );
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const purchaseValue = actionValues.find((a: any) => 
                a.action_type === "purchase" || 
                a.action_type === "omni_purchase" ||
                a.action_type === "offsite_conversion.fb_pixel_purchase"
              );
              
              const purchaseCount = purchaseAction?.value || "0";
              const purchaseTotalValue = purchaseValue?.value || "0";
              
              // Calculate cost per result
              const spend = parseFloat(insight.spend || "0");
              const results = parseInt(purchaseCount, 10);
              const costPerResult = results > 0 ? (spend / results).toFixed(2) : "0";
              
              insightsMap.set(campaignId, {
                spend: insight.spend || "0",
                impressions: insight.impressions || "0",
                clicks: insight.clicks || "0",
                cpm: insight.cpm || "0",
                cpc: insight.cpc || "0",
                ctr: insight.ctr || "0",
                reach: insight.reach || "0",
                frequency: insight.frequency || "0",
                results: purchaseCount,
                purchase_value: purchaseTotalValue,
                cost_per_conversion: costPerResult,
              });
            }
          }
          // Merge insights into campaigns
          campaigns = campaigns.map(campaign => {
            const insights = insightsMap.get(campaign.id);
            if (insights) {
              return {
                ...campaign,
                spend: insights.spend,
                impressions: insights.impressions,
                clicks: insights.clicks,
                cpm: insights.cpm,
                cpc: insights.cpc,
                ctr: insights.ctr,
                reach: insights.reach,
                frequency: insights.frequency,
                results: insights.results,
                purchase_value: insights.purchase_value,
                cost_per_conversion: insights.cost_per_conversion,
              };
            }
            return campaign;
          });
        } else {
          console.error("Error fetching campaign insights:", campaignInsightsResult.reason);
        }
      } catch (e) {
        console.error("Error fetching Meta data:", e);
      }
    }
  } catch (e) {
    console.error("Dashboard page error:", e);
    // Don't throw - render with empty data
  }

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-[#18191a]">
      {/* Full-height Meta Ads Table */}
      <div className="flex-1 p-4 overflow-hidden">
        <MetaAdsTable 
          campaigns={campaigns} 
          accountId={accountId}
          accessToken={accessToken}
          accountName={accountName}
        />
      </div>
    </div>
  );
}
