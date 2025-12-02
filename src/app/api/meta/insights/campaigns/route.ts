import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createMetaClient } from "@/lib/meta/client";

const datePresetMap: Record<string, string> = {
  "Today": "today",
  "Yesterday": "yesterday",
  "Last 7 Days": "last_7d",
  "Last 30 Days": "last_30d",
  "Last 90 Days": "last_90d",
  "This Month": "this_month",
  "Last Month": "last_month",
  "Maximum": "lifetime", // Will use time_range instead
};

export interface CampaignPerformance {
  campaign_id: string;
  campaign_name: string;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  results: number;
  purchase_value: number;
  cpm: number;
  cpc: number;
  ctr: number;
  roas: number;
  cost_per_result: number;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's Meta connection
    const { data: metaConnection } = await supabase
      .from("meta_connections")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!metaConnection?.access_token || !metaConnection?.ad_account_id) {
      return NextResponse.json({ error: "No Meta connection found" }, { status: 404 });
    }

    const accountId = metaConnection.ad_account_id.startsWith("act_")
      ? metaConnection.ad_account_id
      : `act_${metaConnection.ad_account_id}`;

    const metaClient = createMetaClient(metaConnection.access_token);

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const dateRange = searchParams.get("dateRange") || "Last 7 Days";
    const campaignIdsParam = searchParams.get("campaignIds"); // Optional filter
    const breakdownsParam = searchParams.get("breakdowns");
    const customDateStart = searchParams.get("customDateStart");
    const customDateEnd = searchParams.get("customDateEnd");

    // Prepare insight options - always use campaign level
    const insightOptions: {
      date_preset?: string;
      time_range?: { since: string; until: string };
      level: "campaign";
      breakdowns?: string[];
    } = { level: "campaign" };

    // Handle custom date range
    if (customDateStart && customDateEnd) {
      insightOptions.time_range = {
        since: customDateStart,
        until: customDateEnd,
      };
    } else if (dateRange === "Maximum") {
      // Handle Maximum date range with explicit time_range (2 years back)
      const today = new Date();
      const twoYearsAgo = new Date(today);
      twoYearsAgo.setFullYear(today.getFullYear() - 2);
      
      const sinceDate = twoYearsAgo.toISOString().split("T")[0] || "";
      const untilDate = today.toISOString().split("T")[0] || "";
      
      insightOptions.time_range = {
        since: sinceDate,
        until: untilDate,
      };
    } else {
      const datePreset = datePresetMap[dateRange];
      if (datePreset) {
        insightOptions.date_preset = datePreset;
      }
    }

    // Add breakdowns if provided
    if (breakdownsParam) {
      insightOptions.breakdowns = breakdownsParam.split(",").map((b) => b.trim());
    }

    // Fetch campaign-level insights
    const insightsResult = await metaClient.getAccountInsights(accountId, insightOptions);
    let insights = insightsResult?.data || [];

    // Filter by campaign IDs if provided
    if (campaignIdsParam) {
      const campaignIds = campaignIdsParam.split(",").map((id) => id.trim());
      insights = insights.filter((insight) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const insightCampaignId = (insight as any).campaign_id;
        return insightCampaignId && campaignIds.includes(String(insightCampaignId));
      });
    }

    // Group insights by campaign_id (Meta may return multiple rows per campaign for date breakdowns)
    const campaignMap = new Map<string, CampaignPerformance>();

    for (const insight of insights) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawInsight = insight as any;
      const campaignId = String(rawInsight.campaign_id || "");
      const campaignName = rawInsight.campaign_name || "Unknown Campaign";

      if (!campaignId) continue;

      const spend = parseFloat(rawInsight.spend || "0");
      const impressions = parseInt(rawInsight.impressions || "0", 10);
      const clicks = parseInt(rawInsight.clicks || "0", 10);
      const cpm = parseFloat(rawInsight.cpm || "0");
      const cpc = parseFloat(rawInsight.cpc || "0");
      const ctr = parseFloat(rawInsight.ctr || "0");
      const reach = parseInt(rawInsight.reach || "0", 10);

      // Extract purchase data from actions
      const actions = rawInsight.actions || [];
      const actionValues = rawInsight.action_values || [];

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

      const purchaseCount = parseInt(purchaseAction?.value || "0", 10);
      const purchaseTotalValue = parseFloat(purchaseValue?.value || "0");

      // Aggregate if campaign already exists
      const existing = campaignMap.get(campaignId);
      if (existing) {
        existing.spend += spend;
        existing.impressions += impressions;
        existing.clicks += clicks;
        existing.results += purchaseCount;
        existing.purchase_value += purchaseTotalValue;
        existing.reach = Math.max(existing.reach, reach); // Use max for reach (unique users)

        // Recalculate averages (weighted by impressions for CPM, clicks for CPC/CTR)
        if (existing.impressions + impressions > 0) {
          const totalImpressions = existing.impressions + impressions;
          const totalClicks = existing.clicks + clicks;
          
          // Weighted average CPM
          const existingCpmWeight = existing.cpm * existing.impressions;
          const newCpmWeight = cpm * impressions;
          existing.cpm = totalImpressions > 0 ? (existingCpmWeight + newCpmWeight) / totalImpressions : 0;

          // Weighted average CPC
          const existingCpcWeight = existing.cpc * existing.clicks;
          const newCpcWeight = cpc * clicks;
          existing.cpc = totalClicks > 0 ? (existingCpcWeight + newCpcWeight) / totalClicks : 0;

          // Weighted average CTR
          existing.ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
        }
      } else {
        campaignMap.set(campaignId, {
          campaign_id: campaignId,
          campaign_name: campaignName,
          spend,
          impressions,
          clicks,
          reach,
          results: purchaseCount,
          purchase_value: purchaseTotalValue,
          cpm,
          cpc,
          ctr,
          roas: spend > 0 ? purchaseTotalValue / spend : 0,
          cost_per_result: purchaseCount > 0 ? spend / purchaseCount : 0,
        });
      }
    }

    // Calculate final metrics for all campaigns
    const campaigns: CampaignPerformance[] = Array.from(campaignMap.values()).map((campaign) => ({
      ...campaign,
      roas: campaign.spend > 0 ? campaign.purchase_value / campaign.spend : 0,
      cost_per_result: campaign.results > 0 ? campaign.spend / campaign.results : 0,
    }));

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error("Error fetching campaign insights:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch campaign insights" },
      { status: 500 }
    );
  }
}

