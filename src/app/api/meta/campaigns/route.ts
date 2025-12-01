import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createMetaClient } from "@/lib/meta/client";

export const dynamic = "force-dynamic";

// Map display names to Meta API date presets
const datePresetMap: Record<string, string> = {
  "Today": "today",
  "Yesterday": "yesterday",
  "Last 7 Days": "last_7d",
  "Last 14 Days": "last_14d",
  "Last 30 Days": "last_30d",
  "Last 90 Days": "last_90d",
  "This Month": "this_month",
  "Last Month": "last_month",
  "This Year": "this_year",
  "Last Year": "last_year",
  "Maximum": "lifetime", // Returns all-time/lifetime data
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get("dateRange") || "Last 7 Days";
    const accessTokenHeader = request.headers.get("x-access-token");

    // Get access token from header or from database
    let accessToken = accessTokenHeader;
    let accountId: string | null = null;

    if (!accessToken) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { data: metaConnection } = await supabase
        .from("meta_connections")
        .select("access_token, ad_account_id")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!metaConnection?.access_token || !metaConnection?.ad_account_id) {
        return NextResponse.json({ error: "No Meta connection" }, { status: 400 });
      }

      accessToken = metaConnection.access_token;
      accountId = metaConnection.ad_account_id;
    }

    // Get account ID from header if provided
    const accountIdHeader = request.headers.get("x-account-id");
    if (accountIdHeader) {
      accountId = accountIdHeader;
    }

    if (!accessToken || !accountId) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    // Normalize account ID
    accountId = accountId.startsWith("act_") ? accountId : `act_${accountId}`;

    const metaClient = createMetaClient(accessToken);
    
    // Convert display name to API preset
    const datePreset = datePresetMap[dateRange] || "last_7d";

    // For "Maximum", use time_range instead of date_preset (last 2 years)
    const isMaximum = dateRange === "Maximum";
    const insightOptions: { date_preset?: string; time_range?: { since: string; until: string }; level: "campaign" } = {
      level: "campaign"
    };

    if (isMaximum) {
      const today = new Date();
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(today.getFullYear() - 2);
      const sinceDate = twoYearsAgo.toISOString().split('T')[0] || twoYearsAgo.toISOString().substring(0, 10);
      const untilDate = today.toISOString().split('T')[0] || today.toISOString().substring(0, 10);
      insightOptions.time_range = {
        since: sinceDate,
        until: untilDate
      };
    } else {
      insightOptions.date_preset = datePreset;
    }

    console.log(`[campaigns API] Fetching for dateRange: ${dateRange}, date_preset: ${datePreset}`);
    console.log(`[campaigns API] insightOptions:`, JSON.stringify(insightOptions));
    
    // Fetch campaigns and insights in parallel
    const [campaignsResult, insightsResult] = await Promise.allSettled([
      metaClient.getCampaigns(accountId),
      metaClient.getAccountInsights(accountId, insightOptions)
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let campaigns: any[] = [];
    if (campaignsResult.status === "fulfilled") {
      campaigns = campaignsResult.value?.data || [];
      console.log(`[campaigns API] Got ${campaigns.length} campaigns`);
      if (campaigns[0]) {
        console.log(`[campaigns API] First campaign ID: ${campaigns[0].id}, name: ${campaigns[0].name}`);
      }
    } else {
      console.error("[campaigns API] Error fetching campaigns:", campaignsResult.reason);
    }
    
    // Log insights result status
    console.log(`[campaigns API] Insights result status: ${insightsResult.status}`);
    if (insightsResult.status === "rejected") {
      console.error("[campaigns API] Error fetching insights:", insightsResult.reason);
    }

    // Merge insights into campaigns
    if (insightsResult.status === "fulfilled") {
      const insightsData = insightsResult.value?.data || [];
      console.log(`[campaigns API] Got ${insightsData.length} insights records`);
      if (insightsData[0]) {
        console.log(`[campaigns API] Sample insight:`, JSON.stringify(insightsData[0]).substring(0, 500));
      } else {
        console.log(`[campaigns API] No insights data returned`);
      }
      
      const insightsMap = new Map<string, Record<string, string>>();
      let matchedCount = 0;
      for (const insight of insightsData) {
        const campaignId = (insight as { campaign_id?: string }).campaign_id;
        if (campaignId) {
          matchedCount++;
          // Extract purchase count from actions array
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const actions = (insight as any).actions || [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const actionValues = (insight as any).action_values || [];
          
          // Find purchase action
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
      
      console.log(`[campaigns API] Matched ${matchedCount} insights with campaign_id, map size: ${insightsMap.size}`);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      campaigns = campaigns.map((campaign: any) => ({
        ...campaign,
        ...(insightsMap.get(campaign.id) || {
          spend: "0",
          impressions: "0",
          clicks: "0",
          cpm: "0",
          cpc: "0",
          ctr: "0",
          reach: "0",
          frequency: "0",
          results: "0",
          purchase_value: "0",
          cost_per_conversion: "0",
        }),
      }));
      
      // Log merged result
      if (campaigns[0]) {
        console.log(`[campaigns API] After merge - First campaign: ${campaigns[0].name}, spend: ${campaigns[0].spend}, impressions: ${campaigns[0].impressions}`);
      }
    } else {
      // If insights failed, add default values to campaigns
      console.log(`[campaigns API] Insights not available, adding default values`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      campaigns = campaigns.map((campaign: any) => ({
        ...campaign,
        spend: "0",
        impressions: "0",
        clicks: "0",
        cpm: "0",
        cpc: "0",
        ctr: "0",
        reach: "0",
        frequency: "0",
        results: "0",
        purchase_value: "0",
        cost_per_conversion: "0",
      }));
    }

    return NextResponse.json({ 
      campaigns, 
      datePreset,
      dateRange 
    });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}

