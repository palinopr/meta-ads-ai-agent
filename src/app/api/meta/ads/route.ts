import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createMetaClient } from "@/lib/meta/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adSetId = searchParams.get("adSetId");
    const accessTokenHeader = request.headers.get("x-access-token");

    if (!adSetId) {
      return NextResponse.json({ error: "Ad Set ID required" }, { status: 400 });
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
    
    // Fetch ads for the ad set
    const adsResult = await metaClient.getAds(adSetId);
    const ads = adsResult.data || [];

    // Normalize accountId for insights
    if (accountId) {
      accountId = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
    }

    // Try to get insights for ads if we have account ID
    let adsWithInsights = ads;
    if (accountId) {
      try {
        const insightsResult = await metaClient.getAccountInsights(accountId, {
          date_preset: "last_7d",
          level: "ad"
        });
        
        const insightsMap = new Map<string, Record<string, string>>();
        for (const insight of insightsResult.data || []) {
          const adId = (insight as { ad_id?: string }).ad_id;
          if (adId) {
            insightsMap.set(adId, {
              spend: insight.spend || "0",
              impressions: insight.impressions || "0",
              clicks: insight.clicks || "0",
              cpm: insight.cpm || "0",
              cpc: insight.cpc || "0",
              ctr: insight.ctr || "0",
            });
          }
        }

        adsWithInsights = ads
          .filter(ad => ad.adset_id === adSetId || !ad.adset_id)
          .map(ad => ({
            ...ad,
            adset_id: ad.adset_id || adSetId,
            ...(insightsMap.get(ad.id) || {})
          }));
      } catch (e) {
        console.error("Error fetching ad insights:", e);
      }
    }

    return NextResponse.json({ ads: adsWithInsights });
  } catch (error) {
    console.error("Error fetching ads:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch ads" },
      { status: 500 }
    );
  }
}

