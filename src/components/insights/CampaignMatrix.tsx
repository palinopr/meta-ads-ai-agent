"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Minus, Search, X, Download, Filter } from "lucide-react";
import type { CampaignPerformance } from "@/app/api/meta/insights/campaigns/route";

type ViewMode = "table" | "heatmap" | "scatter";

interface CampaignMatrixProps {
  campaigns: CampaignPerformance[];
  onCampaignClick?: (campaignId: string) => void;
  onExportCSV?: (data: CampaignPerformance[]) => void;
}

type SortField = "spend" | "results" | "roas" | "ctr" | "cpm" | "cpc" | "impressions" | "clicks";
type SortDirection = "asc" | "desc";

interface QuickFilter {
  id: string;
  label: string;
  filter: (campaign: CampaignPerformance) => boolean;
  color: string;
}

const QUICK_FILTERS: QuickFilter[] = [
  {
    id: "high-roas",
    label: "ROAS > 2x",
    filter: (c) => c.roas >= 2,
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  {
    id: "low-roas",
    label: "ROAS < 1x",
    filter: (c) => c.roas < 1 && c.roas > 0,
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  {
    id: "high-spend",
    label: "High Spend",
    filter: (c) => c.spend >= 100,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  {
    id: "top-performers",
    label: "Top Performers",
    filter: (c) => c.roas >= 1.5 && c.ctr >= 1,
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
  {
    id: "needs-attention",
    label: "Needs Attention",
    filter: (c) => c.roas < 1 || c.ctr < 0.5,
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  },
];

export function CampaignMatrix({
  campaigns,
  onCampaignClick,
  onExportCSV,
}: CampaignMatrixProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [sortField, setSortField] = useState<SortField>("spend");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Use safe defaults
  const safeCampaigns = Array.isArray(campaigns) ? campaigns : [];

  // Filter campaigns based on search and quick filters
  const filteredCampaigns = useMemo(() => {
    if (safeCampaigns.length === 0) return [];

    let filtered = [...safeCampaigns];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((c) =>
        c.campaign_name.toLowerCase().includes(query)
      );
    }

    // Apply quick filters (OR logic - match any active filter)
    if (activeFilters.length > 0) {
      filtered = filtered.filter((campaign) => {
        return activeFilters.some((filterId) => {
          const filter = QUICK_FILTERS.find((f) => f.id === filterId);
          return filter?.filter(campaign);
        });
      });
    }

    return filtered;
  }, [safeCampaigns, searchQuery, activeFilters]);

  // Sort campaigns
  const sortedCampaigns = useMemo(() => {
    if (filteredCampaigns.length === 0) return [];
    const sorted = [...filteredCampaigns].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (sortDirection === "asc") {
        return aValue - bValue;
      }
      return bValue - aValue;
    });
    return sorted;
  }, [filteredCampaigns, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const toggleFilter = (filterId: string) => {
    setActiveFilters((prev) =>
      prev.includes(filterId)
        ? prev.filter((f) => f !== filterId)
        : [...prev, filterId]
    );
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setActiveFilters([]);
  };

  const handleExport = () => {
    if (onExportCSV) {
      onExportCSV(sortedCampaigns);
    } else {
      // Default CSV export
      exportToCSV(sortedCampaigns);
    }
  };

  // Calculate min/max for heatmap normalization
  const metrics = useMemo(() => {
    if (safeCampaigns.length === 0) return null;

    const fields: SortField[] = ["spend", "results", "roas", "ctr", "cpm", "cpc", "impressions", "clicks"];
    const ranges: Record<string, { min: number; max: number }> = {};

    fields.forEach((field) => {
      const values = safeCampaigns.map((c) => c[field]).filter((v) => v > 0);
      if (values.length > 0) {
        ranges[field] = {
          min: Math.min(...values),
          max: Math.max(...values),
        };
      }
    });

    return ranges;
  }, [safeCampaigns]);

  // Get heatmap color intensity (0-1)
  const getHeatmapIntensity = (value: number, field: SortField): number => {
    if (!metrics || !metrics[field] || metrics[field].max === metrics[field].min) return 0.5;
    return (value - metrics[field].min) / (metrics[field].max - metrics[field].min);
  };

  const getHeatmapColor = (intensity: number, isPositive: boolean): string => {
    if (isPositive) {
      const green = Math.round(34 + intensity * 221);
      return `rgb(34, ${green}, 34)`;
    } else {
      const red = Math.round(34 + intensity * 221);
      return `rgb(${red}, 34, 34)`;
    }
  };

  const formatValue = (value: number, field: SortField): string => {
    switch (field) {
      case "spend":
      case "cpm":
      case "cpc":
        return `$${value.toFixed(2)}`;
      case "roas":
        return `${value.toFixed(2)}x`;
      case "ctr":
        return `${value.toFixed(2)}%`;
      case "impressions":
      case "clicks":
      case "results":
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
        return value.toString();
      default:
        return value.toFixed(2);
    }
  };

  // Highlight matching text in search results
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-700/50 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <TrendingUp className="h-3 w-3 ml-1" />
    ) : (
      <TrendingDown className="h-3 w-3 ml-1" />
    );
  };

  const hasActiveFilters = searchQuery.trim() !== "" || activeFilters.length > 0;

  return (
    <Card className="p-6 bg-white dark:bg-[#1e1f20] border-gray-200 dark:border-gray-800">
      <div className="mb-6">
        {/* Header Row */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Campaign Performance Matrix
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {sortedCampaigns.length} of {safeCampaigns.length} campaigns
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Export Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            
            {/* View Mode Buttons */}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className={viewMode === "table" ? "" : "text-gray-600 dark:text-gray-400"}
              >
                Table
              </Button>
              <Button
                variant={viewMode === "heatmap" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("heatmap")}
                className={viewMode === "heatmap" ? "" : "text-gray-600 dark:text-gray-400"}
              >
                Heatmap
              </Button>
            </div>
          </div>
        </div>

        {/* Search and Filters Row */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter Toggle Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 ${showFilters ? "bg-gray-100 dark:bg-gray-800" : ""}`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilters.length > 0 && (
              <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                {activeFilters.length}
              </span>
            )}
          </Button>

          {/* Clear All Button */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            >
              Clear All
            </Button>
          )}
        </div>

        {/* Quick Filter Chips */}
        {showFilters && (
          <div className="mt-4 flex items-center gap-2 flex-wrap animate-slide-up">
            {QUICK_FILTERS.map((filter) => {
              const isActive = activeFilters.includes(filter.id);
              const matchCount = safeCampaigns.filter(filter.filter).length;
              
              return (
                <button
                  key={filter.id}
                  onClick={() => toggleFilter(filter.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    isActive
                      ? `${filter.color} ring-2 ring-offset-2 ring-current dark:ring-offset-[#1e1f20]`
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {filter.label}
                  <span className={`text-xs ${isActive ? "opacity-80" : "text-gray-500 dark:text-gray-500"}`}>
                    ({matchCount})
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {safeCampaigns.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
          No campaign data available for the selected date range
        </div>
      ) : sortedCampaigns.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
          <Search className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">No campaigns match your filters</p>
          <p className="text-sm mb-4">Try adjusting your search or filter criteria</p>
          <Button variant="outline" size="sm" onClick={clearAllFilters}>
            Clear Filters
          </Button>
        </div>
      ) : viewMode === "table" ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">
                  Campaign Name
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => handleSort("spend")}
                >
                  <div className="flex items-center">
                    Spend
                    <SortIcon field="spend" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => handleSort("results")}
                >
                  <div className="flex items-center">
                    Results
                    <SortIcon field="results" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => handleSort("roas")}
                >
                  <div className="flex items-center">
                    ROAS
                    <SortIcon field="roas" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => handleSort("ctr")}
                >
                  <div className="flex items-center">
                    CTR
                    <SortIcon field="ctr" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => handleSort("cpm")}
                >
                  <div className="flex items-center">
                    CPM
                    <SortIcon field="cpm" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => handleSort("cpc")}
                >
                  <div className="flex items-center">
                    CPC
                    <SortIcon field="cpc" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => handleSort("impressions")}
                >
                  <div className="flex items-center">
                    Impressions
                    <SortIcon field="impressions" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => handleSort("clicks")}
                >
                  <div className="flex items-center">
                    Clicks
                    <SortIcon field="clicks" />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCampaigns.map((campaign, index) => (
                <TableRow
                  key={campaign.campaign_id}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 stagger-item"
                  style={{ animationDelay: `${index * 30}ms` }}
                  onClick={() => onCampaignClick?.(campaign.campaign_id)}
                >
                  <TableCell className="font-medium">
                    {highlightMatch(campaign.campaign_name, searchQuery)}
                  </TableCell>
                  <TableCell>{formatValue(campaign.spend, "spend")}</TableCell>
                  <TableCell>{formatValue(campaign.results, "results")}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {formatValue(campaign.roas, "roas")}
                      {campaign.roas >= 2 ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : campaign.roas < 1 ? (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      ) : (
                        <Minus className="h-3 w-3 text-gray-400" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{formatValue(campaign.ctr, "ctr")}</TableCell>
                  <TableCell>{formatValue(campaign.cpm, "cpm")}</TableCell>
                  <TableCell>{formatValue(campaign.cpc, "cpc")}</TableCell>
                  <TableCell>{formatValue(campaign.impressions, "impressions")}</TableCell>
                  <TableCell>{formatValue(campaign.clicks, "clicks")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : viewMode === "heatmap" ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Campaign</TableHead>
                <TableHead>Spend</TableHead>
                <TableHead>Results</TableHead>
                <TableHead>ROAS</TableHead>
                <TableHead>CTR</TableHead>
                <TableHead>CPM</TableHead>
                <TableHead>CPC</TableHead>
                <TableHead>Impressions</TableHead>
                <TableHead>Clicks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCampaigns.map((campaign, index) => (
                <TableRow
                  key={campaign.campaign_id}
                  className="cursor-pointer hover:opacity-90 stagger-item"
                  style={{ animationDelay: `${index * 30}ms` }}
                  onClick={() => onCampaignClick?.(campaign.campaign_id)}
                >
                  <TableCell className="font-medium">
                    {highlightMatch(campaign.campaign_name, searchQuery)}
                  </TableCell>
                  <TableCell
                    style={{
                      backgroundColor: getHeatmapColor(
                        getHeatmapIntensity(campaign.spend, "spend"),
                        false
                      ),
                      color: "white",
                    }}
                  >
                    {formatValue(campaign.spend, "spend")}
                  </TableCell>
                  <TableCell
                    style={{
                      backgroundColor: getHeatmapColor(
                        getHeatmapIntensity(campaign.results, "results"),
                        true
                      ),
                      color: "white",
                    }}
                  >
                    {formatValue(campaign.results, "results")}
                  </TableCell>
                  <TableCell
                    style={{
                      backgroundColor: getHeatmapColor(
                        getHeatmapIntensity(campaign.roas, "roas"),
                        true
                      ),
                      color: "white",
                    }}
                  >
                    {formatValue(campaign.roas, "roas")}
                  </TableCell>
                  <TableCell
                    style={{
                      backgroundColor: getHeatmapColor(
                        getHeatmapIntensity(campaign.ctr, "ctr"),
                        true
                      ),
                      color: "white",
                    }}
                  >
                    {formatValue(campaign.ctr, "ctr")}
                  </TableCell>
                  <TableCell
                    style={{
                      backgroundColor: getHeatmapColor(
                        getHeatmapIntensity(campaign.cpm, "cpm"),
                        false
                      ),
                      color: "white",
                    }}
                  >
                    {formatValue(campaign.cpm, "cpm")}
                  </TableCell>
                  <TableCell
                    style={{
                      backgroundColor: getHeatmapColor(
                        getHeatmapIntensity(campaign.cpc, "cpc"),
                        false
                      ),
                      color: "white",
                    }}
                  >
                    {formatValue(campaign.cpc, "cpc")}
                  </TableCell>
                  <TableCell
                    style={{
                      backgroundColor: getHeatmapColor(
                        getHeatmapIntensity(campaign.impressions, "impressions"),
                        true
                      ),
                      color: "white",
                    }}
                  >
                    {formatValue(campaign.impressions, "impressions")}
                  </TableCell>
                  <TableCell
                    style={{
                      backgroundColor: getHeatmapColor(
                        getHeatmapIntensity(campaign.clicks, "clicks"),
                        true
                      ),
                      color: "white",
                    }}
                  >
                    {formatValue(campaign.clicks, "clicks")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        // Scatter plot view placeholder
        <div className="h-96 flex items-center justify-center text-gray-500 dark:text-gray-400">
          Scatter plot view coming soon
        </div>
      )}
    </Card>
  );
}

// Helper function to export data as CSV
function exportToCSV(data: CampaignPerformance[]) {
  const headers = [
    "Campaign Name",
    "Campaign ID",
    "Spend",
    "Results",
    "ROAS",
    "CTR",
    "CPM",
    "CPC",
    "Impressions",
    "Clicks",
  ];

  const rows = data.map((c) => [
    `"${c.campaign_name.replace(/"/g, '""')}"`,
    c.campaign_id,
    c.spend.toFixed(2),
    c.results,
    c.roas.toFixed(2),
    c.ctr.toFixed(2),
    c.cpm.toFixed(2),
    c.cpc.toFixed(2),
    c.impressions,
    c.clicks,
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `campaign_performance_${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
