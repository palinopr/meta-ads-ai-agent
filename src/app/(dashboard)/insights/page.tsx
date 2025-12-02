"use client";

import { useState, useEffect } from "react";
import { KPICard } from "@/components/insights/KPICard";
import { TrendChart } from "@/components/insights/TrendChart";
import { InsightsBreadcrumb, type ViewLevel } from "@/components/insights/InsightsBreadcrumb";
import { FilterPanel, type FilterOptions } from "@/components/insights/FilterPanel";
import { AudienceInsights } from "@/components/insights/AudienceInsights";
import { AIInsights } from "@/components/insights/AIInsights";
import { InsightsPageSkeleton } from "@/components/insights/InsightsSkeleton";
import { StickyDateHeader } from "@/components/insights/StickyDateHeader";
import { EmptyState } from "@/components/insights/EmptyState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
  MousePointerClick, 
  TrendingUp, 
  Eye, 
  Users, 
  Target,
  Sparkles,
  Search,
  Loader2,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import type { Campaign } from "@/types";

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
  roas?: number;
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
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter state
  const [filters, setFilters] = useState<FilterOptions>({
    status: "ALL",
  });

  // Date range state - ALWAYS start with "Today" for fast loading
  // User can choose longer ranges after data loads
  const [dateRange, setDateRange] = useState("Today");

  // Comparison mode state
  const [comparisonMode, setComparisonMode] = useState(false);

  // Data state
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [isDataSizeError, setIsDataSizeError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // AI Insights state - NOW OPTIONAL
  const [showAIInsights, setShowAIInsights] = useState(false);

  // Fetch campaigns list (just names, no heavy data)
  useEffect(() => {
    async function fetchCampaigns() {
      setCampaignsLoading(true);
      try {
        const response = await fetch("/api/meta/campaigns?dateRange=Last 7 Days");
        if (response.ok) {
          const data = await response.json();
          setCampaigns(data.campaigns || []);
        }
      } catch (err) {
        console.error("Error fetching campaigns:", err);
      } finally {
        setCampaignsLoading(false);
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

  // Fetch insights ONLY when a campaign is selected
  useEffect(() => {
    if (!selectedCampaignId) {
      setInsights(null);
      return;
    }

    async function fetchInsights() {
      setLoading(true);
      setError(null);
      setIsRateLimited(false);
      setIsDataSizeError(false);
      setShowAIInsights(false); // Reset AI insights when changing campaign
      
      try {
        const params = new URLSearchParams();
        params.append("dateRange", dateRange);
        params.append("level", viewLevel);
        params.append("campaignIds", selectedCampaignId!);

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
          
          if (response.status === 429 || errorData.errorType === "RATE_LIMIT") {
            setIsRateLimited(true);
            throw new Error(errorData.message || "API rate limit reached. Please wait a moment and try again.");
          }
          
          // Handle data size error - suggest shorter date range
          if (errorData.errorType === "DATA_SIZE_ERROR") {
            setIsDataSizeError(true);
            throw new Error(errorData.message || "The requested date range contains too much data. Try selecting a shorter date range.");
          }
          
          throw new Error(errorData.error || `Failed to fetch insights: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
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
  }, [dateRange, viewLevel, selectedCampaignId, filters, comparisonMode, refreshTrigger]);

  // Handle campaign selection
  const handleCampaignSelect = (campaign: Campaign) => {
    setSelectedCampaignId(campaign.id);
    setViewLevel("campaign");
    setBreadcrumbItems([{ level: "campaign", id: campaign.id, name: campaign.name }]);
  };

  // Handle navigation (back to account level)
  const handleNavigate = (level: ViewLevel) => {
    if (level === "account") {
      setViewLevel("account");
      setBreadcrumbItems([]);
      setSelectedCampaignId(null);
      setInsights(null);
      setShowAIInsights(false);
    }
  };

  // Handle AI Insights button click
  const handleRequestAIInsights = () => {
    setShowAIInsights(true);
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

  // Filter campaigns by search
  const filteredCampaigns = campaigns.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group campaigns by status
  const activeCampaigns = filteredCampaigns.filter((c) => c.status === "ACTIVE");
  const pausedCampaigns = filteredCampaigns.filter((c) => c.status === "PAUSED");
  const otherCampaigns = filteredCampaigns.filter((c) => c.status !== "ACTIVE" && c.status !== "PAUSED");

  // ============================================
  // ACCOUNT LEVEL VIEW - Campaign Selection
  // ============================================
  if (viewLevel === "account" && !selectedCampaignId) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50 dark:bg-[#18191a] p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Campaign Insights
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Select a campaign to view detailed analytics, trends, and AI-powered insights.
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e1f20] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Campaign List */}
          {campaignsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-3 text-gray-500 dark:text-gray-400">Loading campaigns...</span>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <EmptyState
              type="no-campaigns"
              title="No Campaigns Found"
              description={searchQuery ? "Try adjusting your search query." : "Connect your Meta account and create campaigns to see insights."}
            />
          ) : (
            <div className="space-y-6">
              {/* Active Campaigns */}
              {activeCampaigns.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Active Campaigns ({activeCampaigns.length})
                  </h2>
                  <div className="grid gap-3">
                    {activeCampaigns.map((campaign) => (
                      <CampaignCard
                        key={campaign.id}
                        campaign={campaign}
                        onClick={() => handleCampaignSelect(campaign)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Paused Campaigns */}
              {pausedCampaigns.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                    Paused Campaigns ({pausedCampaigns.length})
                  </h2>
                  <div className="grid gap-3">
                    {pausedCampaigns.map((campaign) => (
                      <CampaignCard
                        key={campaign.id}
                        campaign={campaign}
                        onClick={() => handleCampaignSelect(campaign)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Other Campaigns */}
              {otherCampaigns.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                    Other Campaigns ({otherCampaigns.length})
                  </h2>
                  <div className="grid gap-3">
                    {otherCampaigns.map((campaign) => (
                      <CampaignCard
                        key={campaign.id}
                        campaign={campaign}
                        onClick={() => handleCampaignSelect(campaign)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================
  // CAMPAIGN LEVEL VIEW - Detailed Analytics
  // ============================================

  if (loading) {
    return <InsightsPageSkeleton />;
  }

  if (error) {
    if (isRateLimited) {
      return (
        <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-[#18191a]">
          <EmptyState
            type="rate-limit"
            description={error}
            action={{
              label: "Retry in 1 Minute",
              onClick: () => setRefreshTrigger((prev) => prev + 1),
            }}
            secondaryAction={{
              label: "Try Shorter Date Range",
              onClick: () => setDateRange("Last 7 Days"),
            }}
          />
        </div>
      );
    }

    // Data size error - too much data requested, suggest shorter date range
    if (isDataSizeError) {
      return (
        <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-[#18191a]">
          <EmptyState
            type="error"
            title="Date Range Too Large"
            description="This campaign has too much data for the selected date range. Daily data is being fetched in chunks, but some chunks are still too large. Try a shorter date range."
            action={{
              label: "Use Last 30 Days",
              onClick: () => setDateRange("Last 30 Days"),
            }}
            secondaryAction={{
              label: "Use Last 7 Days",
              onClick: () => setDateRange("Last 7 Days"),
            }}
          />
        </div>
      );
    }
    
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-[#18191a]">
        <EmptyState
          type="error"
          title="Error Loading Insights"
          description={error}
          action={{
            label: "Retry",
            onClick: () => setRefreshTrigger((prev) => prev + 1),
          }}
          secondaryAction={{
            label: "Back to Campaigns",
            onClick: () => handleNavigate("account"),
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
          description="This campaign doesn't have performance data for the selected date range."
          action={{
            label: "Try Maximum Date Range",
            onClick: () => setDateRange("Maximum"),
          }}
          secondaryAction={{
            label: "Back to Campaigns",
            onClick: () => handleNavigate("account"),
          }}
        />
      </div>
    );
  }

  const { summary, dailyData } = insights;
  
  if (!Array.isArray(dailyData)) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-[#18191a]">
        <EmptyState
          type="loading-failed"
          title="Data Format Error"
          description="Invalid data format received from the API. Please try again."
          action={{
            label: "Refresh",
            onClick: () => setRefreshTrigger((prev) => prev + 1),
          }}
        />
      </div>
    );
  }

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-[#18191a] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {selectedCampaign?.name || "Campaign Analytics"}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Performance trends and detailed analytics for this campaign
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
        <div className="mb-4">
          <InsightsBreadcrumb items={breadcrumbItems} onNavigate={handleNavigate} />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
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

        {/* Trend Chart */}
        <TrendChart
          data={dailyData}
          previousData={insights.previousDailyData}
          dateRange={dateRange}
          onDateRangeChange={(range) => {
            setDateRange(range);
            if (comparisonMode) {
              setComparisonMode(false);
            }
          }}
          breakdownData={insights.breakdownData}
          breakdownType={insights.breakdownType}
          onComparisonModeChange={setComparisonMode}
        />

        {/* Audience Insights */}
        {insights.breakdownData && insights.breakdownData.length > 0 && insights.breakdownType && (
          <AudienceInsights
            breakdownData={insights.breakdownData}
            breakdownType={insights.breakdownType}
          />
        )}

        {/* AI Insights - OPTIONAL - Only shows when requested */}
        {!showAIInsights ? (
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-xl">
                  <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    AI Insights & Recommendations
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Get AI-powered analysis, predictions, and optimization suggestions for this campaign
                  </p>
                </div>
              </div>
              <Button
                onClick={handleRequestAIInsights}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Get AI Insights
              </Button>
            </div>
          </Card>
        ) : (
          <AIInsights
            summary={insights.summary}
            dailyData={insights.dailyData.map((d) => ({
              ...d,
              roas: d.spend > 0 ? d.purchase_value / d.spend : 0,
            }))}
            dateRange={dateRange}
            campaignIds={selectedCampaignId ? [selectedCampaignId] : undefined}
            viewLevel={viewLevel}
          />
        )}
      </div>
    </div>
  );
}

// ============================================
// Campaign Card Component
// ============================================
function CampaignCard({ campaign, onClick }: { campaign: Campaign; onClick: () => void }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "PAUSED":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  return (
    <Card
      className="p-4 bg-white dark:bg-[#1e1f20] border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {campaign.name}
            </h3>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(campaign.status)}`}>
                {campaign.status}
              </span>
              {campaign.objective && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {campaign.objective.replace(/_/g, " ")}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
            View Insights
          </span>
          <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
          </div>
        </div>
      </div>
    </Card>
  );
}
