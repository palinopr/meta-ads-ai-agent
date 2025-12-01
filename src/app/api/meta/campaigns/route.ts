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
  "Maximum": "maximum",
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

    // Fetch campaigns and insights in parallel
    const [campaignsResult, insightsResult] = await Promise.allSettled([
      metaClient.getCampaigns(accountId),
      metaClient.getAccountInsights(accountId, { 
        date_preset: datePreset, 
        level: "campaign" 
      })
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let campaigns: any[] = [];
    if (campaignsResult.status === "fulfilled") {
      campaigns = campaignsResult.value?.data || [];
    } else {
      console.error("Error fetching campaigns:", campaignsResult.reason);
    }

    // Merge insights into campaigns
    if (insightsResult.status === "fulfilled") {
      const insightsMap = new Map<string, Record<string, string>>();
      for (const insight of insightsResult.value?.data || []) {
        const campaignId = (insight as { campaign_id?: string }).campaign_id;
        if (campaignId) {
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

