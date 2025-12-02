"use client";

import { useState, useEffect } from "react";
import { KPICard } from "@/components/insights/KPICard";
import { TrendChart } from "@/components/insights/TrendChart";
import { CampaignSelector } from "@/components/insights/CampaignSelector";
import { InsightsBreadcrumb, type ViewLevel } from "@/components/insights/InsightsBreadcrumb";
import { FilterPanel, type FilterOptions } from "@/components/insights/FilterPanel";
import { CampaignMatrix } from "@/components/insights/CampaignMatrix";
import { AudienceInsights } from "@/components/insights/AudienceInsights";
import { AIInsights } from "@/components/insights/AIInsights";
import { InsightsPageSkeleton } from "@/components/insights/InsightsSkeleton";
import { StickyDateHeader } from "@/components/insights/StickyDateHeader";
import { EmptyState } from "@/components/insights/EmptyState";
import { DollarSign, MousePointerClick, TrendingUp, Eye, Users, Target } from "lucide-react";
import type { Campaign } from "@/types";
import type { CampaignPerformance } from "@/app/api/meta/insights/campaigns/route";

interface InsightsSummary {
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

interface DailyDataPoint {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  cpm: number;
  cpc: number;
  ctr: number;
  results: number;
  purchase_value: number;
  roas?: number; // Optional, calculated from spend and purchase_value
}

interface BreakdownData {
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
}

interface InsightsResponse {
  summary: InsightsSummary;
  dailyData: DailyDataPoint[];
  previousDailyData?: DailyDataPoint[];
  breakdownData?: BreakdownData[];
  breakdownType?: string;
}

export default function InsightsPage() {
  // View level state (Account, Campaign, Ad Set, Ad)
  const [viewLevel, setViewLevel] = useState<ViewLevel>("account");
  const [breadcrumbItems, setBreadcrumbItems] = useState<Array<{ level: ViewLevel; id: string; name: string }>>([]);

  // Campaign selection state
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);

  // Filter state
  const [filters, setFilters] = useState<FilterOptions>({
    status: "ALL",
  });

  // Date range state
  const [dateRange, setDateRange] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("insights-date-range") || "Last 7 Days";
    }
    return "Last 7 Days";
  });

  // Comparison mode state
  const [comparisonMode, setComparisonMode] = useState(false);

  // Data state
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [campaignPerformance, setCampaignPerformance] = useState<CampaignPerformance[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch campaigns list for selector
  useEffect(() => {
    async function fetchCampaigns() {
      try {
        const response = await fetch("/api/meta/campaigns?dateRange=Maximum");
        if (response.ok) {
          const data = await response.json();
          setCampaigns(data.campaigns || []);
        }
      } catch (err) {
        console.error("Error fetching campaigns:", err);
      }
    }
    fetchCampaigns();
  }, []);

  // Persist date range
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("insights-date-range", dateRange);
    }
  }, [dateRange]);

  // Fetch insights when filters/selection change
  useEffect(() => {
    async function fetchInsights() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.append("dateRange", dateRange);
        params.append("level", viewLevel);

        // Add campaign filter if campaigns are selected
        // When viewLevel is "campaign", we're drilling down to a specific campaign
        // When viewLevel is "account" and campaigns are selected, we're filtering account view
        if (selectedCampaignIds.length > 0) {
          params.append("campaignIds", selectedCampaignIds.join(","));
        }

        // Add custom date range if provided
        if (filters.customDateStart && filters.customDateEnd) {
          params.append("customDateStart", filters.customDateStart);
          params.append("customDateEnd", filters.customDateEnd);
        }

        // Add breakdowns if provided
        if (filters.breakdowns && filters.breakdowns.length > 0) {
          params.append("breakdowns", filters.breakdowns.join(","));
        }

        // Add comparison mode if enabled
        if (comparisonMode) {
          params.append("compare", "true");
        }

        const response = await fetch(`/api/meta/insights?${params.toString()}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch insights: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        // Validate response structure
        if (!data.summary || !Array.isArray(data.dailyData)) {
          throw new Error("Invalid data format received from API");
        }
        setInsights(data);
        setLastUpdated(new Date());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load insights");
        console.error("Error fetching insights:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchInsights();
  }, [dateRange, viewLevel, selectedCampaignIds, filters, comparisonMode, refreshTrigger]);

  // Fetch campaign performance data for matrix (only at account level)
  useEffect(() => {
    async function fetchCampaignPerformance() {
      if (viewLevel !== "account") {
        setCampaignPerformance([]);
        return;
      }

      try {
        const params = new URLSearchParams();
        params.append("dateRange", dateRange);

        // Add campaign filter if campaigns are selected
        if (selectedCampaignIds.length > 0) {
          params.append("campaignIds", selectedCampaignIds.join(","));
        }

        // Add custom date range if provided
        if (filters.customDateStart && filters.customDateEnd) {
          params.append("customDateStart", filters.customDateStart);
          params.append("customDateEnd", filters.customDateEnd);
        }

        const response = await fetch(`/api/meta/insights/campaigns?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          // Validate response structure
          if (data.campaigns && Array.isArray(data.campaigns)) {
            setCampaignPerformance(data.campaigns);
          } else {
            setCampaignPerformance([]);
          }
        } else {
          console.error("Failed to fetch campaign performance:", response.status, response.statusText);
          setCampaignPerformance([]);
        }
      } catch (err) {
        console.error("Error fetching campaign performance:", err);
      }
    }

    fetchCampaignPerformance();
  }, [dateRange, viewLevel, selectedCampaignIds, filters]);

  // Handle navigation (drill-down)
  const handleNavigate = (level: ViewLevel, id?: string) => {
    setViewLevel(level);
    
    // Update breadcrumbs and selected campaigns based on level
    if (level === "account") {
      setBreadcrumbItems([]);
      setSelectedCampaignIds([]); // Clear selection when going back to account level
    } else if (level === "campaign" && id) {
      const campaign = campaigns.find((c) => c.id === id);
      if (campaign) {
        setBreadcrumbItems([{ level: "campaign", id, name: campaign.name }]);
        // Set selected campaign ID so insights API filters by this campaign
        setSelectedCampaignIds([id]);
      }
    }
    // TODO: Add adset and ad navigation when those APIs are ready
  };

  // Get unique objectives for filter dropdown
  const objectives = Array.from(new Set(campaigns.map((c) => c.objective).filter(Boolean))) as string[];

  // Breakdown options
  const breakdownOptions = [
    { value: "age", label: "Age" },
    { value: "gender", label: "Gender" },
    { value: "age_gender", label: "Age & Gender" },
    { value: "country", label: "Country" },
    { value: "region", label: "Region" },
    { value: "device_platform", label: "Device Platform" },
    { value: "publisher_platform", label: "Publisher Platform" },
    { value: "platform_position", label: "Platform Position" },
    { value: "hourly_stats_aggregated_by_advertiser_time_zone", label: "Hour of Day" },
    { value: "day_of_week", label: "Day of Week" },
  ];

  if (loading && !insights) {
    return <InsightsPageSkeleton />;
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-[#18191a]">
        <EmptyState
          type="error"
          title="Error Loading Insights"
          description={error}
          action={{
            label: "Retry",
            onClick: () => window.location.reload(),
          }}
          secondaryAction={{
            label: "Change Date Range",
            onClick: () => setDateRange("Last 7 Days"),
          }}
        />
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-[#18191a]">
        <EmptyState
          type="no-data"
          title="No Insights Data Available"
          description="Make sure you have active campaigns with performance data for the selected date range."
          action={{
            label: "Try Maximum Date Range",
            onClick: () => setDateRange("Maximum"),
          }}
        />
      </div>
    );
  }

  const { summary, dailyData } = insights;
  
  // Ensure dailyData is an array
  if (!Array.isArray(dailyData)) {
    console.error("dailyData is not an array:", dailyData);
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-[#18191a]">
        <EmptyState
          type="loading-failed"
          title="Data Format Error"
          description="Invalid data format received from the API. Please try again."
          action={{
            label: "Refresh",
            onClick: () => window.location.reload(),
          }}
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-[#18191a] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {viewLevel === "account" ? "Account Overview" : "Campaign Analytics"}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {viewLevel === "account" 
              ? "High-level performance metrics across all campaigns. Click a campaign to view detailed analytics."
              : "AI-powered performance analytics and trends for this campaign"
            }
          </p>
        </div>

        {/* Sticky Date Range Header */}
        <StickyDateHeader
          dateRange={dateRange}
          onDateRangeChange={(range) => {
            setDateRange(range);
            if (comparisonMode) {
              setComparisonMode(false);
            }
          }}
          comparisonMode={comparisonMode}
          onComparisonModeChange={setComparisonMode}
          isLoading={loading}
          onRefresh={() => setRefreshTrigger((prev) => prev + 1)}
          lastUpdated={lastUpdated || undefined}
        />

        {/* Breadcrumb Navigation */}
        {breadcrumbItems.length > 0 && (
          <div className="mb-4">
            <InsightsBreadcrumb items={breadcrumbItems} onNavigate={handleNavigate} />
          </div>
        )}

        {/* Filters & Controls Bar */}
        <div className="flex items-center gap-4 flex-wrap">
          {viewLevel === "account" && (
            <CampaignSelector
              campaigns={campaigns}
              selectedCampaignIds={selectedCampaignIds}
              onSelectionChange={setSelectedCampaignIds}
              placeholder="All Campaigns"
            />
          )}
          <FilterPanel
            filters={filters}
            onFiltersChange={setFilters}
            objectives={objectives}
            breakdownOptions={breakdownOptions}
          />
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Spend"
            value={summary.spend}
            format="currency"
            icon={<DollarSign className="h-5 w-5" />}
            sparklineData={dailyData.slice(-7).map(d => ({ value: d.spend, date: d.date }))}
            tooltip="Total amount spent on ads during this period"
          />
          <KPICard
            title="Results"
            value={summary.results}
            format="number"
            icon={<Target className="h-5 w-5" />}
            sparklineData={dailyData.slice(-7).map(d => ({ value: d.results, date: d.date }))}
            tooltip="Number of conversions achieved (purchases, leads, etc.)"
          />
          <KPICard
            title="ROAS"
            value={summary.roas}
            format="decimal"
            trend={summary.roas >= 1 ? "up" : "down"}
            icon={<TrendingUp className="h-5 w-5" />}
            sparklineData={dailyData.slice(-7).map(d => ({ 
              value: d.spend > 0 ? d.purchase_value / d.spend : 0, 
              date: d.date 
            }))}
            tooltip="Return on Ad Spend = Revenue ÷ Ad Spend. Above 1.0 means profitable."
          />
          <KPICard
            title="CTR"
            value={summary.ctr}
            format="percentage"
            icon={<MousePointerClick className="h-5 w-5" />}
            sparklineData={dailyData.slice(-7).map(d => ({ value: d.ctr, date: d.date }))}
            tooltip="Click-Through Rate = Clicks ÷ Impressions × 100. Higher is better."
          />
          <KPICard
            title="Impressions"
            value={summary.impressions}
            format="number"
            icon={<Eye className="h-5 w-5" />}
            sparklineData={dailyData.slice(-7).map(d => ({ value: d.impressions, date: d.date }))}
            tooltip="Total number of times your ads were shown"
          />
          <KPICard
            title="Clicks"
            value={summary.clicks}
            format="number"
            icon={<MousePointerClick className="h-5 w-5" />}
            sparklineData={dailyData.slice(-7).map(d => ({ value: d.clicks, date: d.date }))}
            tooltip="Total number of clicks on your ads"
          />
          <KPICard
            title="CPM"
            value={summary.cpm}
            format="currency"
            icon={<DollarSign className="h-5 w-5" />}
            sparklineData={dailyData.slice(-7).map(d => ({ value: d.cpm, date: d.date }))}
            tooltip="Cost Per Mille (1000 impressions). Lower is more efficient."
          />
          <KPICard
            title="Reach"
            value={summary.reach}
            format="number"
            icon={<Users className="h-5 w-5" />}
            tooltip="Unique people who saw your ads at least once"
          />
        </div>

        {/* Account Level: Show Campaign Matrix Only */}
        {viewLevel === "account" ? (
          <>
            {/* Info Banner */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Account Overview
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    View your overall performance metrics above. Click on any campaign below to see detailed trends, charts, and analytics.
                  </p>
                </div>
              </div>
            </div>

            {/* Campaign Performance Matrix */}
            <CampaignMatrix
              campaigns={campaignPerformance}
              onCampaignClick={(campaignId) => {
                handleNavigate("campaign", campaignId);
              }}
            />
          </>
        ) : (
          <>
            {/* Campaign Level: Show Detailed Charts */}
            {/* Info Banner */}
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
                    Campaign Analytics
                  </h3>
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    Detailed performance trends and insights for this campaign. Use the filters above to customize your view.
                  </p>
                </div>
              </div>
            </div>

            {/* Trend Chart */}
            <TrendChart
              data={dailyData}
              previousData={insights.previousDailyData}
              dateRange={dateRange}
              onDateRangeChange={(range) => {
                setDateRange(range);
                // Disable comparison mode when changing date range (to avoid confusion)
                if (comparisonMode) {
                  setComparisonMode(false);
                }
              }}
              breakdownData={insights.breakdownData}
              breakdownType={insights.breakdownType}
              onComparisonModeChange={setComparisonMode}
            />
          </>
        )}

        {/* Audience Insights */}
        {insights.breakdownData && insights.breakdownData.length > 0 && insights.breakdownType && (
          <AudienceInsights
            breakdownData={insights.breakdownData}
            breakdownType={insights.breakdownType}
          />
        )}

        {/* AI Insights & Recommendations */}
        {insights && (
          <AIInsights
            summary={insights.summary}
            dailyData={insights.dailyData.map((d) => ({
              ...d,
              roas: d.spend > 0 ? d.purchase_value / d.spend : 0,
            }))}
            dateRange={dateRange}
            campaignIds={selectedCampaignIds.length > 0 ? selectedCampaignIds : undefined}
            viewLevel={viewLevel}
          />
        )}
      </div>
    </div>
  );
}
