import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createMetaClient, MetaRateLimitError, MetaDataSizeError } from "@/lib/meta/client";
import { metaApiCache, CACHE_TTL } from "@/lib/meta/cache";

const datePresetMap: Record<string, string> = {
  "Today": "today",
  "Yesterday": "yesterday",
  "Last 7 Days": "last_7d",
  "Last 30 Days": "last_30d",
  "Last 90 Days": "last_90d",
  "This Month": "this_month",
  "Last Month": "last_month",
  "Maximum": "lifetime",
};

interface BreakdownDataPoint {
  dimension: string;
  spend: number;
  impressions: number;
  clicks: number;
  results: number;
  roas: number;
  ctr: number;
  cpm: number;
  cpc: number;
  purchase_value: number;
}

interface HourlyDataPoint {
  day_of_week: string;
  hour: number;
  spend: number;
  impressions: number;
  clicks: number;
  results: number;
  roas: number;
  ctr: number;
  purchase_value: number;
}

// Process breakdown insights into aggregated data points
function processBreakdownData(
  insights: Array<Record<string, unknown>>,
  breakdownKey: string
): BreakdownDataPoint[] {
  const aggregated = new Map<string, BreakdownDataPoint>();

  for (const insight of insights) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawInsight = insight as any;
    
    const dimension = String(rawInsight[breakdownKey] || "Unknown");
    
    const spend = parseFloat(rawInsight.spend || "0");
    const impressions = parseInt(rawInsight.impressions || "0", 10);
    const clicks = parseInt(rawInsight.clicks || "0", 10);
    const cpm = parseFloat(rawInsight.cpm || "0");
    const cpc = parseFloat(rawInsight.cpc || "0");
    const ctr = parseFloat(rawInsight.ctr || "0");

    // Extract purchase data
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

    const existing = aggregated.get(dimension);
    if (existing) {
      existing.spend += spend;
      existing.impressions += impressions;
      existing.clicks += clicks;
      existing.results += purchaseCount;
      existing.purchase_value += purchaseTotalValue;
      // Recalculate averages after aggregation
      existing.cpm = existing.impressions > 0 ? (existing.spend / existing.impressions) * 1000 : 0;
      existing.cpc = existing.clicks > 0 ? existing.spend / existing.clicks : 0;
      existing.ctr = existing.impressions > 0 ? (existing.clicks / existing.impressions) * 100 : 0;
      existing.roas = existing.spend > 0 ? existing.purchase_value / existing.spend : 0;
    } else {
      aggregated.set(dimension, {
        dimension,
        spend,
        impressions,
        clicks,
        results: purchaseCount,
        purchase_value: purchaseTotalValue,
        cpm,
        cpc,
        ctr,
        roas: spend > 0 ? purchaseTotalValue / spend : 0,
      });
    }
  }

  return Array.from(aggregated.values()).sort((a, b) => b.spend - a.spend);
}

// Process hourly breakdown data (special handling for day_of_week + hourly_stats)
function processHourlyData(insights: Array<Record<string, unknown>>): HourlyDataPoint[] {
  const result: HourlyDataPoint[] = [];

  for (const insight of insights) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawInsight = insight as any;
    
    const dayOfWeek = rawInsight.day_of_week;
    const hourlyStats = rawInsight.hourly_stats_aggregated_by_advertiser_time_zone;
    
    // Parse hour from hourly_stats format (e.g., "00:00:00" - "23:00:00")
    let hour = 0;
    if (hourlyStats) {
      const hourMatch = String(hourlyStats).match(/^(\d+)/);
      if (hourMatch && hourMatch[1]) {
        hour = parseInt(hourMatch[1], 10);
      }
    }

    const spend = parseFloat(rawInsight.spend || "0");
    const impressions = parseInt(rawInsight.impressions || "0", 10);
    const clicks = parseInt(rawInsight.clicks || "0", 10);
    const ctr = parseFloat(rawInsight.ctr || "0");

    // Extract purchase data
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

    // Map day number to day name
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    let dayName = "Unknown";
    if (dayOfWeek !== undefined) {
      const dayNum = parseInt(String(dayOfWeek), 10);
      if (!isNaN(dayNum) && dayNum >= 0 && dayNum < 7) {
        dayName = dayNames[dayNum] || "Unknown";
      }
    }

    result.push({
      day_of_week: dayName,
      hour,
      spend,
      impressions,
      clicks,
      results: purchaseCount,
      roas: spend > 0 ? purchaseTotalValue / spend : 0,
      ctr,
      purchase_value: purchaseTotalValue,
    });
  }

  return result;
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
    const level = (searchParams.get("level") as "account" | "campaign" | "adset" | "ad") || "ad";
    const entityId = searchParams.get("entityId"); // Campaign, Ad Set, or Ad ID
    const customDateStart = searchParams.get("customDateStart");
    const customDateEnd = searchParams.get("customDateEnd");

    // Build base options for insight requests
    const buildInsightOptions = (breakdowns: string[]): {
      date_preset?: string;
      time_range?: { since: string; until: string };
      level: "account" | "campaign" | "adset" | "ad";
      breakdowns: string[];
    } => {
      const options: {
        date_preset?: string;
        time_range?: { since: string; until: string };
        level: "account" | "campaign" | "adset" | "ad";
        breakdowns: string[];
      } = { level, breakdowns };

      if (customDateStart && customDateEnd) {
        options.time_range = { since: customDateStart, until: customDateEnd };
      } else if (dateRange === "Maximum") {
        const today = new Date();
        const twoYearsAgo = new Date(today);
        twoYearsAgo.setFullYear(today.getFullYear() - 2);
        options.time_range = {
          since: twoYearsAgo.toISOString().split("T")[0] || "",
          until: today.toISOString().split("T")[0] || "",
        };
      } else {
        options.date_preset = datePresetMap[dateRange];
      }

      return options;
    };

    // Generate cache key
    const cacheKey = `breakdowns:${accountId}:${level}:${entityId || "all"}:${dateRange}:${customDateStart || ""}:${customDateEnd || ""}`;
    
    // Check cache first
    const cachedResponse = metaApiCache.get<{
      ageData: BreakdownDataPoint[];
      genderData: BreakdownDataPoint[];
      deviceData: BreakdownDataPoint[];
      placementData: BreakdownDataPoint[];
      hourlyData: HourlyDataPoint[];
    }>(cacheKey);
    
    if (cachedResponse) {
      console.log("[Breakdowns API] Returning cached response");
      return NextResponse.json(cachedResponse);
    }

    // Fetch different breakdowns in parallel for efficiency
    const breakdownRequests = [
      // Age breakdown
      metaClient.getAccountInsights(accountId, buildInsightOptions(["age"]))
        .catch(err => {
          console.error("Error fetching age breakdown:", err);
          return { data: [] };
        }),
      // Gender breakdown  
      metaClient.getAccountInsights(accountId, buildInsightOptions(["gender"]))
        .catch(err => {
          console.error("Error fetching gender breakdown:", err);
          return { data: [] };
        }),
      // Device breakdown
      metaClient.getAccountInsights(accountId, buildInsightOptions(["device_platform"]))
        .catch(err => {
          console.error("Error fetching device breakdown:", err);
          return { data: [] };
        }),
      // Placement breakdown
      metaClient.getAccountInsights(accountId, buildInsightOptions(["publisher_platform"]))
        .catch(err => {
          console.error("Error fetching placement breakdown:", err);
          return { data: [] };
        }),
      // Hourly breakdown (requires day_of_week + hourly_stats)
      metaClient.getAccountInsights(accountId, buildInsightOptions(["hourly_stats_aggregated_by_advertiser_time_zone"]))
        .catch(err => {
          console.error("Error fetching hourly breakdown:", err);
          return { data: [] };
        }),
    ];

    const results = await Promise.all(breakdownRequests);
    const [ageResult, genderResult, deviceResult, placementResult, hourlyResult] = results;

    // Filter by entity ID if provided
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filterByEntity = (insights: any[]): Array<Record<string, unknown>> => {
      if (!entityId) return insights as Array<Record<string, unknown>>;
      
      return insights.filter(insight => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = insight as any;
        if (level === "campaign") return raw.campaign_id === entityId;
        if (level === "adset") return raw.adset_id === entityId;
        if (level === "ad") return raw.ad_id === entityId;
        return true;
      }) as Array<Record<string, unknown>>;
    };

    // Process each breakdown (handle potential undefined results)
    const ageData = processBreakdownData(filterByEntity(ageResult?.data || []), "age");
    const genderData = processBreakdownData(filterByEntity(genderResult?.data || []), "gender");
    const deviceData = processBreakdownData(filterByEntity(deviceResult?.data || []), "device_platform");
    const placementData = processBreakdownData(filterByEntity(placementResult?.data || []), "publisher_platform");
    const hourlyData = processHourlyData(filterByEntity(hourlyResult?.data || []));

    const responseData = {
      ageData,
      genderData,
      deviceData,
      placementData,
      hourlyData,
    };

    // Cache the response
    const cacheTTL = dateRange === "Maximum" || dateRange === "Last 90 Days" 
      ? CACHE_TTL.LONG 
      : CACHE_TTL.MEDIUM;
    
    metaApiCache.set(cacheKey, responseData, cacheTTL);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching breakdowns:", error);
    
    if (error instanceof MetaRateLimitError) {
      return NextResponse.json(
        { 
          error: "Application request limit reached",
          errorType: "RATE_LIMIT",
          message: "Meta API rate limit exceeded. Please wait a few minutes.",
          retryAfter: error.retryAfter,
        },
        { status: 429 }
      );
    }
    
    if (error instanceof MetaDataSizeError) {
      return NextResponse.json(
        { 
          error: "Data request too large",
          errorType: "DATA_SIZE_ERROR",
          message: "Try a shorter date range for breakdown data.",
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch breakdowns" },
      { status: 500 }
    );
  }
}

