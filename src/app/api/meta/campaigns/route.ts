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

    console.log(`[campaigns API] ========== REQUEST START ==========`);
    console.log(`[campaigns API] dateRange: "${dateRange}", isMaximum: ${isMaximum}`);
    console.log(`[campaigns API] insightOptions:`, JSON.stringify(insightOptions, null, 2));
    console.log(`[campaigns API] HAS time_range: ${!!insightOptions.time_range}`);
    console.log(`[campaigns API] HAS date_preset: ${!!insightOptions.date_preset}`);
    console.log(`[campaigns API] accountId: ${accountId}`);
    
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
    
    // CRITICAL: Log insights count FIRST
    const insightCount = insightsResult.status === "fulfilled" ? (insightsResult.value?.data?.length || 0) : -1;
    console.log(`[campaigns API] >>> INSIGHTS COUNT: ${insightCount} <<<`);
    
    if (insightsResult.status === "rejected") {
      console.log(`[campaigns API] ❌ INSIGHTS FAILED: ${String(insightsResult.reason)}`);
    } else if (insightCount === 0) {
      console.log(`[campaigns API] ⚠️ INSIGHTS EMPTY - Meta API returned no data!`);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const firstRaw = (insightsResult.value?.data?.[0] || {}) as any;
      const keys = Object.keys(firstRaw);
      console.log(`[campaigns API] First insight keys: ${keys.slice(0, 5).join(', ')}...`);
      console.log(`[campaigns API] >>> INSIGHT campaign_id: "${firstRaw.campaign_id}" <<<`);
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

      // Log first 3 insight's campaign_id format for debugging
      console.log(`[campaigns API] ========== ID MATCHING DEBUG ==========`);
      for (let i = 0; i < Math.min(3, insightsData.length); i++) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const insight = insightsData[i] as any;
        console.log(`[campaigns API] Insight[${i}] campaign_id: "${insight.campaign_id}" (type: ${typeof insight.campaign_id}), spend: ${insight.spend}`);
      }
      // Log first 3 campaign IDs for comparison
      for (let i = 0; i < Math.min(3, campaigns.length); i++) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const campaign = campaigns[i] as any;
        console.log(`[campaigns API] Campaign[${i}] id: "${campaign.id}" (type: ${typeof campaign.id})`);
      }
      
      // Check if ANY campaign ID matches ANY insight campaign_id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const insightCampaignIds = new Set(insightsData.map((i: any) => i.campaign_id).filter(Boolean));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const campaignIds = new Set(campaigns.map((c: any) => c.id));
      const matchingIds = [...insightCampaignIds].filter(id => campaignIds.has(id));
      console.log(`[campaigns API] Insight campaign_ids count: ${insightCampaignIds.size}`);
      console.log(`[campaigns API] Campaign ids count: ${campaignIds.size}`);
      console.log(`[campaigns API] MATCHING IDs: ${matchingIds.length}`);
      // ALWAYS log sample IDs for debugging
      const sampleInsightId = [...insightCampaignIds][0] || "NONE";
      const sampleCampaignId = [...campaignIds][0] || "NONE";
      console.log(`[campaigns API] SAMPLE INSIGHT campaign_id: "${sampleInsightId}"`);
      console.log(`[campaigns API] SAMPLE CAMPAIGN id: "${sampleCampaignId}"`);
      if (matchingIds.length === 0) {
        console.log(`[campaigns API] ❌ NO MATCH FOUND!`);
      }

      for (const insight of insightsData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawInsight = insight as any;
        // Get campaign_id - should always be present when level="campaign"
        // Note: rawInsight.id is the insight record ID, NOT the campaign ID - don't use it as fallback
        const campaignId = rawInsight.campaign_id ? String(rawInsight.campaign_id) : null;
        
        if (campaignId) {
          matchedCount++;
          // Extract purchase count from actions array
          const actions = rawInsight.actions || [];
          const actionValues = rawInsight.action_values || [];
          
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
          const spend = parseFloat(rawInsight.spend || "0");
          const results = parseInt(purchaseCount, 10);
          const costPerResult = results > 0 ? (spend / results).toFixed(2) : "0";
          
          insightsMap.set(String(campaignId), {
            spend: rawInsight.spend || "0",
            impressions: rawInsight.impressions || "0",
            clicks: rawInsight.clicks || "0",
            cpm: rawInsight.cpm || "0",
            cpc: rawInsight.cpc || "0",
            ctr: rawInsight.ctr || "0",
            reach: rawInsight.reach || "0",
            frequency: rawInsight.frequency || "0",
            results: purchaseCount,
            purchase_value: purchaseTotalValue,
            cost_per_conversion: costPerResult,
          });
        }
      }
      
      console.log(`[campaigns API] Matched ${matchedCount} insights with campaign_id, map size: ${insightsMap.size}`);

      // Log how many have actual spend data
      let insightsWithSpend = 0;
      insightsMap.forEach((value) => {
        if (parseFloat(value.spend || "0") > 0) insightsWithSpend++;
      });
      console.log(`[campaigns API] Insights WITH spend > 0: ${insightsWithSpend}`);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      campaigns = campaigns.map((campaign: any) => ({
        ...campaign,
        // Use String() for consistent matching
        ...(insightsMap.get(String(campaign.id)) || {
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
      const campaignsWithSpend = campaigns.filter((c: { spend?: string }) => parseFloat(c.spend || "0") > 0);
      console.log(`[campaigns API] After merge - Campaigns WITH spend: ${campaignsWithSpend.length}`);
      if (campaignsWithSpend[0]) {
        console.log(`[campaigns API] First campaign WITH spend: ${campaignsWithSpend[0].name}, spend: ${campaignsWithSpend[0].spend}`);
      }
      if (campaigns[0]) {
        console.log(`[campaigns API] First campaign (any): ${campaigns[0].name}, spend: ${campaigns[0].spend}`);
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

