import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createMetaClient } from "@/lib/meta/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaignId");
    const accessTokenHeader = request.headers.get("x-access-token");

    if (!campaignId) {
      return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });
    }

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

      if (!metaConnection?.access_token) {
        return NextResponse.json({ error: "No Meta connection" }, { status: 400 });
      }

      accessToken = metaConnection.access_token;
      accountId = metaConnection.ad_account_id;
    }

    if (!accessToken) {
      return NextResponse.json({ error: "No access token" }, { status: 400 });
    }

    const metaClient = createMetaClient(accessToken);
    
    // Fetch ad sets for the campaign
    const adSetsResult = await metaClient.getAdSets(campaignId);
    const adSets = adSetsResult.data || [];

    // Normalize accountId for insights
    if (accountId) {
      accountId = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
    }

    // Try to get insights for ad sets if we have account ID
    let adSetsWithInsights = adSets;
    if (accountId) {
      try {
        const insightsResult = await metaClient.getAccountInsights(accountId, {
          date_preset: "last_7d",
          level: "adset"
        });
        
        const insightsMap = new Map<string, Record<string, string>>();
        for (const insight of insightsResult.data || []) {
          const adsetId = (insight as { adset_id?: string }).adset_id;
          if (adsetId) {
            insightsMap.set(adsetId, {
              spend: insight.spend || "0",
              impressions: insight.impressions || "0",
              clicks: insight.clicks || "0",
              cpm: insight.cpm || "0",
              cpc: insight.cpc || "0",
              ctr: insight.ctr || "0",
              reach: insight.reach || "0",
            });
          }
        }

        adSetsWithInsights = adSets
          .filter(adSet => adSet.campaign_id === campaignId || !adSet.campaign_id)
          .map(adSet => ({
            ...adSet,
            campaign_id: adSet.campaign_id || campaignId,
            ...(insightsMap.get(adSet.id) || {})
          }));
      } catch (e) {
        console.error("Error fetching adset insights:", e);
      }
    }

    return NextResponse.json({ adSets: adSetsWithInsights });
  } catch (error) {
    console.error("Error fetching ad sets:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch ad sets" },
      { status: 500 }
    );
  }
}

