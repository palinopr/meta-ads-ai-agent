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
    const level = (searchParams.get("level") as "account" | "campaign" | "adset" | "ad") || "account";
    const campaignIdsParam = searchParams.get("campaignIds"); // Comma-separated campaign IDs
    const breakdownsParam = searchParams.get("breakdowns"); // Comma-separated breakdowns
    const customDateStart = searchParams.get("customDateStart");
    const customDateEnd = searchParams.get("customDateEnd");
    const compareMode = searchParams.get("compare") === "true"; // Comparison mode

    // Prepare insight options
    // IMPORTANT: If filtering by campaigns at account level, we need to fetch at campaign level
    // to get campaign_id field in the response. Otherwise, use the requested level.
    const effectiveLevel = campaignIdsParam && level === "account" ? "campaign" : level;
    
    const insightOptions: {
      date_preset?: string;
      time_range?: { since: string; until: string };
      level?: "account" | "campaign" | "adset" | "ad";
      breakdowns?: string[];
    } = { level: effectiveLevel };

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

    // Helper function to calculate previous period dates
    const getPreviousPeriodDates = (
      currentStart: string | null,
      currentEnd: string | null,
      dateRange: string
    ): { since: string; until: string } | null => {
      if (currentStart && currentEnd) {
        // Custom date range - calculate previous period of same length
        const start = new Date(currentStart);
        const end = new Date(currentEnd);
        const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const prevEnd = new Date(start);
        prevEnd.setDate(prevEnd.getDate() - 1);
        const prevStart = new Date(prevEnd);
        prevStart.setDate(prevStart.getDate() - daysDiff);
        return {
          since: prevStart.toISOString().split("T")[0] || "",
          until: prevEnd.toISOString().split("T")[0] || "",
        };
      }

      // Map date ranges to previous period
      const today = new Date();
      const prevPeriodMap: Record<string, { since: string; until: string }> = {
        "Today": {
          since: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0] || "",
          until: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0] || "",
        },
        "Yesterday": {
          since: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0] || "",
          until: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0] || "",
        },
        "Last 7 Days": {
          since: new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0] || "",
          until: new Date(today.getTime() - 8 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0] || "",
        },
        "Last 30 Days": {
          since: new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0] || "",
          until: new Date(today.getTime() - 31 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0] || "",
        },
        "Last 90 Days": {
          since: new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0] || "",
          until: new Date(today.getTime() - 91 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0] || "",
        },
      };

      return prevPeriodMap[dateRange] || null;
    };

    // Fetch current period insights
    const insightsResult = await metaClient.getAccountInsights(accountId, insightOptions);
    let insights = insightsResult?.data || [];

    // Fetch previous period insights if comparison mode is enabled
    let previousInsights: typeof insights = [];
    if (compareMode) {
      const prevPeriodDates = getPreviousPeriodDates(
        customDateStart || null,
        customDateEnd || null,
        dateRange
      );

      if (prevPeriodDates) {
        const prevInsightOptions = {
          ...insightOptions,
          time_range: prevPeriodDates,
          date_preset: undefined, // Override date_preset with time_range
        };

        try {
          const prevInsightsResult = await metaClient.getAccountInsights(
            accountId,
            prevInsightOptions
          );
          previousInsights = prevInsightsResult?.data || [];
        } catch (err) {
          console.error("Error fetching previous period insights:", err);
          // Continue without previous data if fetch fails
        }
      }
    }

    // Filter by campaign IDs if provided
    // IMPORTANT: Campaign filtering works when level is "campaign", "adset", or "ad"
    // because campaign_id field is only included in the response when level is "campaign", "adset", or "ad"
    // When level is "account" and campaignIdsParam is provided, we switch to campaign level (effectiveLevel)
    if (campaignIdsParam && (effectiveLevel === "campaign" || effectiveLevel === "adset" || effectiveLevel === "ad")) {
      const campaignIds = campaignIdsParam.split(",").map((id) => id.trim());
      insights = insights.filter((insight) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const insightCampaignId = (insight as any).campaign_id;
        return insightCampaignId && campaignIds.includes(String(insightCampaignId));
      });
    }

    // Aggregate insights (Meta may return multiple rows for date breakdowns)
    const aggregated = {
      spend: 0,
      impressions: 0,
      clicks: 0,
      reach: 0,
      results: 0,
      purchase_value: 0,
    };

    let totalCpm = 0;
    let totalCpc = 0;
    let totalCtr = 0;
    let cpmCount = 0;
    let cpcCount = 0;
    let ctrCount = 0;
    let maxReach = 0;

    const dailyData: Array<{
      date: string;
      spend: number;
      impressions: number;
      clicks: number;
      cpm: number;
      cpc: number;
      ctr: number;
      results: number;
      purchase_value: number;
    }> = [];

    for (const insight of insights) {
      const spend = parseFloat(insight.spend || "0");
      const impressions = parseInt(insight.impressions || "0", 10);
      const clicks = parseInt(insight.clicks || "0", 10);
      const cpm = parseFloat(insight.cpm || "0");
      const cpc = parseFloat(insight.cpc || "0");
      const ctr = parseFloat(insight.ctr || "0");
      const reach = parseInt(insight.reach || "0", 10);

      // Extract purchase data from actions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const actions = (insight as any).actions || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const actionValues = (insight as any).action_values || [];

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

      // Aggregate totals
      aggregated.spend += spend;
      aggregated.impressions += impressions;
      aggregated.clicks += clicks;
      aggregated.results += purchaseCount;
      aggregated.purchase_value += purchaseTotalValue;
      maxReach = Math.max(maxReach, reach);

      // Aggregate averages (only count non-zero values)
      if (cpm > 0) {
        totalCpm += cpm;
        cpmCount++;
      }
      if (cpc > 0) {
        totalCpc += cpc;
        cpcCount++;
      }
      if (ctr > 0) {
        totalCtr += ctr;
        ctrCount++;
      }

      // Store daily data for trend chart - aggregate by date
      // Multiple campaigns/ad sets may have data for the same day, so we aggregate them
      if (insight.date_start) {
        const dateKey = insight.date_start;
        const existingDayIndex = dailyData.findIndex((d) => d.date === dateKey);
        
        if (existingDayIndex >= 0) {
          // Aggregate with existing day data
          const existing = dailyData[existingDayIndex];
          if (existing) {
            dailyData[existingDayIndex] = {
              date: dateKey,
              spend: existing.spend + spend,
              impressions: existing.impressions + impressions,
              clicks: existing.clicks + clicks,
              cpm: (existing.cpm + cpm) / 2, // Average CPM
              cpc: (existing.cpc + cpc) / 2, // Average CPC
              ctr: existing.impressions + impressions > 0 
                ? ((existing.clicks + clicks) / (existing.impressions + impressions)) * 100 
                : existing.ctr, // Recalculate CTR from aggregated clicks/impressions
              results: existing.results + purchaseCount,
              purchase_value: existing.purchase_value + purchaseTotalValue,
            };
          }
        } else {
          // New day - add as new data point
          dailyData.push({
            date: dateKey,
            spend,
            impressions,
            clicks,
            cpm,
            cpc,
            ctr,
            results: purchaseCount,
            purchase_value: purchaseTotalValue,
          });
        }
      }
    }

    // Calculate averages
    const avgCpm = cpmCount > 0 ? totalCpm / cpmCount : 0;
    const avgCpc = cpcCount > 0 ? totalCpc / cpcCount : 0;
    const avgCtr = ctrCount > 0 ? totalCtr / ctrCount : 0;

    // Calculate ROAS
    const roas = aggregated.spend > 0 ? aggregated.purchase_value / aggregated.spend : 0;

    // Calculate cost per result
    const costPerResult = aggregated.results > 0 ? aggregated.spend / aggregated.results : 0;

    // Sort daily data by date
    dailyData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Process previous period daily data if comparison mode is enabled
    const previousDailyData: Array<{
      date: string;
      spend: number;
      impressions: number;
      clicks: number;
      cpm: number;
      cpc: number;
      ctr: number;
      results: number;
      purchase_value: number;
    }> = [];

    if (compareMode && previousInsights.length > 0) {
      // Filter previous insights by campaign IDs if needed
      let filteredPreviousInsights = previousInsights;
      if (campaignIdsParam && (effectiveLevel === "campaign" || effectiveLevel === "adset" || effectiveLevel === "ad")) {
        const campaignIds = campaignIdsParam.split(",").map((id) => id.trim());
        filteredPreviousInsights = previousInsights.filter((insight) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const insightCampaignId = (insight as any).campaign_id;
          return insightCampaignId && campaignIds.includes(String(insightCampaignId));
        });
      }

      for (const insight of filteredPreviousInsights) {
        const spend = parseFloat(insight.spend || "0");
        const impressions = parseInt(insight.impressions || "0", 10);
        const clicks = parseInt(insight.clicks || "0", 10);
        const cpm = parseFloat(insight.cpm || "0");
        const cpc = parseFloat(insight.cpc || "0");
        const ctr = parseFloat(insight.ctr || "0");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const actions = (insight as any).actions || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const actionValues = (insight as any).action_values || [];

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

        // Store previous period daily data - aggregate by date
        if (insight.date_start) {
          const dateKey = insight.date_start;
          const existingDayIndex = previousDailyData.findIndex((d) => d.date === dateKey);
          
          if (existingDayIndex >= 0) {
            // Aggregate with existing day data
            const existing = previousDailyData[existingDayIndex];
            if (existing) {
              previousDailyData[existingDayIndex] = {
                date: dateKey,
                spend: existing.spend + spend,
                impressions: existing.impressions + impressions,
                clicks: existing.clicks + clicks,
                cpm: (existing.cpm + cpm) / 2,
                cpc: (existing.cpc + cpc) / 2,
                ctr: existing.impressions + impressions > 0 
                  ? ((existing.clicks + clicks) / (existing.impressions + impressions)) * 100 
                  : existing.ctr,
                results: existing.results + purchaseCount,
                purchase_value: existing.purchase_value + purchaseTotalValue,
              };
            }
          } else {
            // New day - add as new data point
            previousDailyData.push({
              date: dateKey,
              spend,
              impressions,
              clicks,
              cpm,
              cpc,
              ctr,
              results: purchaseCount,
              purchase_value: purchaseTotalValue,
            });
          }
        }
      }

      previousDailyData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    // Process breakdown data if breakdowns are requested
    const breakdownData: Array<{
      dimension: string;
      date: string;
      spend: number;
      impressions: number;
      clicks: number;
      results: number;
      roas: number;
      ctr: number;
      cpm: number;
      cpc: number;
    }> = [];

    if (breakdownsParam && insights.length > 0) {
      // Group by date and dimension for chart visualization
      const dateDimensionMap = new Map<string, Map<string, {
        spend: number;
        impressions: number;
        clicks: number;
        results: number;
        purchase_value: number;
        cpm: number;
        cpc: number;
        ctr: number;
      }>>();
      
      for (const insight of insights) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawInsight = insight as any;
        const date = rawInsight.date_start || "";
        
        if (!date) continue;
        
        let dimension = "Unknown";
        const breakdownTypes = breakdownsParam.split(",").map((b) => b.trim());
        
        for (const breakdownType of breakdownTypes) {
          const dimensionValue = rawInsight[breakdownType];
          if (dimensionValue) {
            dimension = String(dimensionValue);
            break;
          }
        }

        if (!dateDimensionMap.has(date)) {
          dateDimensionMap.set(date, new Map());
        }
        
        const dateMap = dateDimensionMap.get(date)!;
        const existing = dateMap.get(dimension);
        
        const spend = parseFloat(rawInsight.spend || "0");
        const impressions = parseInt(rawInsight.impressions || "0", 10);
        const clicks = parseInt(rawInsight.clicks || "0", 10);
        const cpm = parseFloat(rawInsight.cpm || "0");
        const cpc = parseFloat(rawInsight.cpc || "0");
        const ctr = parseFloat(rawInsight.ctr || "0");

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

        if (existing) {
          existing.spend += spend;
          existing.impressions += impressions;
          existing.clicks += clicks;
          existing.results += purchaseCount;
          existing.purchase_value += purchaseTotalValue;
        } else {
          dateMap.set(dimension, {
            spend,
            impressions,
            clicks,
            results: purchaseCount,
            purchase_value: purchaseTotalValue,
            cpm,
            cpc,
            ctr,
          });
        }
      }

      // Convert to array format with date included
      dateDimensionMap.forEach((dateMap, date) => {
        dateMap.forEach((data, dimension) => {
          breakdownData.push({
            dimension,
            date,
            spend: data.spend,
            impressions: data.impressions,
            clicks: data.clicks,
            results: data.results,
            roas: data.spend > 0 ? data.purchase_value / data.spend : 0,
            ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
            cpm: data.cpm,
            cpc: data.cpc,
          });
        });
      });
    }

    // Ensure dailyData is always an array
    const safeDailyData = Array.isArray(dailyData) ? dailyData : [];
    const safePreviousDailyData = Array.isArray(previousDailyData) && previousDailyData.length > 0 ? previousDailyData : undefined;
    const safeBreakdownData = Array.isArray(breakdownData) && breakdownData.length > 0 ? breakdownData : undefined;

    return NextResponse.json({
      summary: {
        spend: aggregated.spend || 0,
        impressions: aggregated.impressions || 0,
        clicks: aggregated.clicks || 0,
        reach: maxReach || 0,
        results: aggregated.results || 0,
        purchase_value: aggregated.purchase_value || 0,
        cpm: avgCpm || 0,
        cpc: avgCpc || 0,
        ctr: avgCtr || 0,
        roas: roas || 0,
        cost_per_result: costPerResult || 0,
      },
      dailyData: safeDailyData,
      previousDailyData: safePreviousDailyData,
      breakdownData: safeBreakdownData,
      breakdownType: breakdownsParam || undefined,
    });
  } catch (error) {
    console.error("Error fetching insights:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch insights" },
      { status: 500 }
    );
  }
}

