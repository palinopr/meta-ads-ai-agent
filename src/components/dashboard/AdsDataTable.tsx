"use client";

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { 
  Search, Filter, Columns, Download, MoreHorizontal, ArrowUpDown, ArrowUp, ArrowDown, X,
  ChevronRight, Home, Play, Pause, Loader2
} from "lucide-react";

// Types for the table
export interface CampaignRow {
  id: string;
  name: string;
  status: string;
  objective?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  budget_remaining?: string;
  buying_type?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  reach?: string;
  frequency?: string;
  conversions?: string;
  created_time?: string;
}

export interface AdSetRow {
  id: string;
  name: string;
  campaign_id: string;
  status: string;
  daily_budget?: string;
  lifetime_budget?: string;
  budget_remaining?: string;
  optimization_goal?: string;
  billing_event?: string;
  bid_amount?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  reach?: string;
}

export interface AdRow {
  id: string;
  name: string;
  adset_id: string;
  status: string;
  creative?: {
    id: string;
    name?: string;
    body?: string;
    title?: string;
    thumbnail_url?: string;
  };
  spend?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
}

type ViewLevel = "campaigns" | "adsets" | "ads";

interface BreadcrumbItem {
  level: ViewLevel;
  id?: string;
  name: string;
}

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
} | null;

interface AdsDataTableProps {
  campaigns: CampaignRow[];
  accountId: string;
  accessToken: string;
}

export function AdsDataTable({ campaigns, accessToken }: AdsDataTableProps) {
  const [viewLevel, setViewLevel] = useState<ViewLevel>("campaigns");
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignRow | null>(null);
  const [selectedAdSet, setSelectedAdSet] = useState<AdSetRow | null>(null);
  
  const [adSets, setAdSets] = useState<AdSetRow[]>([]);
  const [ads, setAds] = useState<AdRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "PAUSED">("ALL");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Breadcrumb navigation
  const breadcrumbs: BreadcrumbItem[] = useMemo(() => {
    const items: BreadcrumbItem[] = [{ level: "campaigns", name: "All Campaigns" }];
    if (selectedCampaign) {
      items.push({ level: "adsets", id: selectedCampaign.id, name: selectedCampaign.name });
    }
    if (selectedAdSet) {
      items.push({ level: "ads", id: selectedAdSet.id, name: selectedAdSet.name });
    }
    return items;
  }, [selectedCampaign, selectedAdSet]);

  // Fetch Ad Sets for a campaign
  const fetchAdSets = useCallback(async (campaignId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/meta/adsets?campaignId=${campaignId}`, {
        headers: { "x-access-token": accessToken }
      });
      if (response.ok) {
        const data = await response.json();
        setAdSets(data.adSets || []);
      } else {
        console.error("Failed to fetch ad sets");
        setAdSets([]);
      }
    } catch (error) {
      console.error("Error fetching ad sets:", error);
      setAdSets([]);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  // Fetch Ads for an ad set
  const fetchAds = useCallback(async (adSetId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/meta/ads?adSetId=${adSetId}`, {
        headers: { "x-access-token": accessToken }
      });
      if (response.ok) {
        const data = await response.json();
        setAds(data.ads || []);
      } else {
        console.error("Failed to fetch ads");
        setAds([]);
      }
    } catch (error) {
      console.error("Error fetching ads:", error);
      setAds([]);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  // Handle campaign click -> show ad sets
  const handleCampaignClick = useCallback((campaign: CampaignRow) => {
    setSelectedCampaign(campaign);
    setSelectedAdSet(null);
    setViewLevel("adsets");
    setSearchQuery("");
    setSortConfig(null);
    setStatusFilter("ALL");
    fetchAdSets(campaign.id);
  }, [fetchAdSets]);

  // Handle ad set click -> show ads
  const handleAdSetClick = useCallback((adSet: AdSetRow) => {
    setSelectedAdSet(adSet);
    setViewLevel("ads");
    setSearchQuery("");
    setSortConfig(null);
    setStatusFilter("ALL");
    fetchAds(adSet.id);
  }, [fetchAds]);

  // Handle breadcrumb navigation
  const handleBreadcrumbClick = useCallback((item: BreadcrumbItem) => {
    if (item.level === "campaigns") {
      setSelectedCampaign(null);
      setSelectedAdSet(null);
      setViewLevel("campaigns");
      setAdSets([]);
      setAds([]);
    } else if (item.level === "adsets" && selectedCampaign) {
      setSelectedAdSet(null);
      setViewLevel("adsets");
      setAds([]);
    }
    setSearchQuery("");
    setSortConfig(null);
    setStatusFilter("ALL");
  }, [selectedCampaign]);

  // Filter and sort data
  const filteredData = useMemo(() => {
    let data: (CampaignRow | AdSetRow | AdRow)[] = [];
    
    if (viewLevel === "campaigns") {
      data = [...campaigns];
    } else if (viewLevel === "adsets") {
      data = [...adSets];
    } else {
      data = [...ads];
    }

    // Filter by status
    if (statusFilter !== "ALL") {
      data = data.filter(item => 
        statusFilter === "ACTIVE" ? item.status === "ACTIVE" : item.status !== "ACTIVE"
      );
    }

    // Filter by search
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      data = data.filter(item => 
        item.name.toLowerCase().includes(lowerQuery) || 
        item.id.includes(lowerQuery)
      );
    }

    // Sort
    if (sortConfig) {
      data.sort((a, b) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const aVal = (a as any)[sortConfig.key];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bVal = (b as any)[sortConfig.key];
        
        let aValue: string | number = String(aVal ?? "");
        let bValue: string | number = String(bVal ?? "");

        // Numeric sorting for metrics
        if (['spend', 'impressions', 'clicks', 'cpc', 'cpm', 'ctr', 'daily_budget', 'lifetime_budget'].includes(sortConfig.key)) {
          aValue = parseFloat(String(aValue) || "0");
          bValue = parseFloat(String(bValue) || "0");
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [viewLevel, campaigns, adSets, ads, statusFilter, searchQuery, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return current.direction === 'asc' 
          ? { key, direction: 'desc' } 
          : null;
      }
      return { key, direction: 'asc' };
    });
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />;
  };

  // Format budget display
  const formatBudget = (item: CampaignRow | AdSetRow) => {
    const daily = item.daily_budget;
    const lifetime = item.lifetime_budget;
    
    if (daily && parseFloat(daily) > 0) {
      return { amount: `$${(parseFloat(daily) / 100).toFixed(2)}`, type: "Daily" };
    }
    if (lifetime && parseFloat(lifetime) > 0) {
      return { amount: `$${(parseFloat(lifetime) / 100).toFixed(2)}`, type: "Lifetime" };
    }
    return { amount: "—", type: "" };
  };

  // Format metrics
  const formatMetric = (value: string | undefined, prefix: string = "", suffix: string = "") => {
    if (!value || value === "0" || parseFloat(value) === 0) return "—";
    const num = parseFloat(value);
    if (prefix === "$") return `$${num.toFixed(2)}`;
    if (suffix === "%") return `${num.toFixed(2)}%`;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Breadcrumb Navigation */}
      <div className="border-b border-border px-4 py-2 bg-secondary/5">
        <nav className="flex items-center gap-1 text-sm">
          {breadcrumbs.map((item, index) => (
            <div key={item.level + (item.id || "")} className="flex items-center">
              {index > 0 && <ChevronRight className="w-4 h-4 mx-1 text-muted-foreground" />}
              <button
                onClick={() => handleBreadcrumbClick(item)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-md transition-colors",
                  index === breadcrumbs.length - 1
                    ? "text-foreground font-medium bg-secondary/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                )}
              >
                {index === 0 && <Home className="w-3.5 h-3.5" />}
                <span className="max-w-[200px] truncate">{item.name}</span>
              </button>
            </div>
          ))}
        </nav>
      </div>

      {/* Toolbar */}
      <div className="border-b border-border p-2 flex items-center justify-between bg-secondary/5">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder={`Search ${viewLevel}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 py-1.5 text-sm bg-background border border-border rounded-md w-64 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors border",
                statusFilter !== "ALL" 
                  ? "bg-primary/10 text-primary border-primary/20" 
                  : "text-muted-foreground hover:text-foreground border-transparent hover:bg-secondary/50"
              )}
            >
              <Filter className="w-4 h-4" />
              {statusFilter === "ALL" ? "Filter" : statusFilter === "ACTIVE" ? "Active" : "Inactive"}
            </button>
            
            {isFilterOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setIsFilterOpen(false)} />
                <div className="absolute top-full left-0 mt-1 w-40 bg-popover border border-border rounded-md shadow-lg z-40 py-1 animate-in fade-in zoom-in-95 duration-100">
                  <button onClick={() => { setStatusFilter("ALL"); setIsFilterOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-secondary/50 transition-colors">All</button>
                  <button onClick={() => { setStatusFilter("ACTIVE"); setIsFilterOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-secondary/50 transition-colors">Active Only</button>
                  <button onClick={() => { setStatusFilter("PAUSED"); setIsFilterOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-secondary/50 transition-colors">Inactive Only</button>
                </div>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-md">
            <Columns className="w-4 h-4" />
          </button>
          <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-md">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-background">
        <button 
          className={cn(
            "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
            viewLevel === "campaigns" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
          )}
          onClick={() => handleBreadcrumbClick({ level: "campaigns", name: "All Campaigns" })}
        >
          Campaigns
          <span className="ml-2 px-1.5 py-0.5 text-xs bg-secondary rounded-md">
            {campaigns.length}
          </span>
        </button>
        <button 
          className={cn(
            "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
            viewLevel === "adsets" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
          )}
          disabled={!selectedCampaign}
        >
          Ad Sets
          {adSets.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-secondary rounded-md">
              {adSets.length}
            </span>
          )}
        </button>
        <button 
          className={cn(
            "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
            viewLevel === "ads" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
          )}
          disabled={!selectedAdSet}
        >
          Ads
          {ads.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-secondary rounded-md">
              {ads.length}
            </span>
          )}
        </button>
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading {viewLevel}...</p>
            </div>
          </div>
        ) : (
          <table className="w-full text-left border-collapse relative">
            <thead className="bg-secondary/10 sticky top-0 z-10 text-xs font-semibold text-muted-foreground uppercase tracking-wider backdrop-blur-sm">
              <tr>
                <th className="p-4 border-b border-border w-10 bg-secondary/5">
                  <input type="checkbox" className="rounded border-border bg-background" />
                </th>
                <th className="p-4 border-b border-border w-12 bg-secondary/5">Off/On</th>
                <th 
                  className="p-4 border-b border-border min-w-[250px] cursor-pointer hover:bg-secondary/10 group bg-secondary/5 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    {viewLevel === "campaigns" ? "Campaign" : viewLevel === "adsets" ? "Ad Set" : "Ad"} Name
                    <SortIcon columnKey="name" />
                  </div>
                </th>
                <th 
                  className="p-4 border-b border-border cursor-pointer hover:bg-secondary/10 group bg-secondary/5 transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Delivery
                    <SortIcon columnKey="status" />
                  </div>
                </th>
                <th 
                  className="p-4 border-b border-border text-right cursor-pointer hover:bg-secondary/10 group bg-secondary/5 transition-colors"
                  onClick={() => handleSort('daily_budget')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Budget
                    <SortIcon columnKey="daily_budget" />
                  </div>
                </th>
                <th 
                  className="p-4 border-b border-border text-right cursor-pointer hover:bg-secondary/10 group bg-secondary/5 transition-colors"
                  onClick={() => handleSort('spend')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Spent
                    <SortIcon columnKey="spend" />
                  </div>
                </th>
                <th 
                  className="p-4 border-b border-border text-right cursor-pointer hover:bg-secondary/10 group bg-secondary/5 transition-colors"
                  onClick={() => handleSort('impressions')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Impr.
                    <SortIcon columnKey="impressions" />
                  </div>
                </th>
                <th 
                  className="p-4 border-b border-border text-right cursor-pointer hover:bg-secondary/10 group bg-secondary/5 transition-colors"
                  onClick={() => handleSort('cpm')}
                >
                  <div className="flex items-center justify-end gap-1">
                    CPM
                    <SortIcon columnKey="cpm" />
                  </div>
                </th>
                <th 
                  className="p-4 border-b border-border text-right cursor-pointer hover:bg-secondary/10 group bg-secondary/5 transition-colors"
                  onClick={() => handleSort('clicks')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Clicks
                    <SortIcon columnKey="clicks" />
                  </div>
                </th>
                <th 
                  className="p-4 border-b border-border text-right cursor-pointer hover:bg-secondary/10 group bg-secondary/5 transition-colors"
                  onClick={() => handleSort('ctr')}
                >
                  <div className="flex items-center justify-end gap-1">
                    CTR
                    <SortIcon columnKey="ctr" />
                  </div>
                </th>
                <th 
                  className="p-4 border-b border-border text-right cursor-pointer hover:bg-secondary/10 group bg-secondary/5 transition-colors"
                  onClick={() => handleSort('cpc')}
                >
                  <div className="flex items-center justify-end gap-1">
                    CPC
                    <SortIcon columnKey="cpc" />
                  </div>
                </th>
                <th className="p-4 border-b border-border w-10 bg-secondary/5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-8 h-8 text-muted-foreground/50" />
                      <p>No {viewLevel} found.</p>
                      {(searchQuery || statusFilter !== "ALL") && (
                        <button 
                          onClick={() => { setSearchQuery(""); setStatusFilter("ALL"); }}
                          className="text-primary hover:underline text-sm"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const budget = formatBudget(item as CampaignRow | AdSetRow);
                  const isCampaign = viewLevel === "campaigns";
                  const isAdSet = viewLevel === "adsets";
                  
                  return (
                    <tr key={item.id} className="hover:bg-secondary/5 transition-colors group text-sm">
                      <td className="p-4">
                        <input type="checkbox" className="rounded border-border bg-background" />
                      </td>
                      <td className="p-4">
                        <button className="text-muted-foreground hover:text-primary transition-colors">
                          {item.status === "ACTIVE" ? (
                            <div className="w-8 h-4 bg-primary rounded-full relative">
                              <div className="absolute right-1 top-0.5 w-3 h-3 bg-white rounded-full shadow-sm" />
                            </div>
                          ) : (
                            <div className="w-8 h-4 bg-muted rounded-full relative">
                              <div className="absolute left-1 top-0.5 w-3 h-3 bg-white rounded-full shadow-sm" />
                            </div>
                          )}
                        </button>
                      </td>
                      <td className="p-4">
                        <button 
                          className="text-left font-medium text-foreground group-hover:text-primary cursor-pointer transition-colors"
                          onClick={() => {
                            if (isCampaign) handleCampaignClick(item as CampaignRow);
                            else if (isAdSet) handleAdSetClick(item as AdSetRow);
                          }}
                          disabled={viewLevel === "ads"}
                        >
                          <div className="flex items-center gap-2">
                            <span className="max-w-[220px] truncate">{item.name}</span>
                            {(isCampaign || isAdSet) && (
                              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-normal mt-0.5 flex items-center gap-2">
                            <span>ID: {item.id}</span>
                            {isCampaign && (item as CampaignRow).objective && (
                              <span className="text-primary/70">• {(item as CampaignRow).objective}</span>
                            )}
                          </div>
                        </button>
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full border inline-flex items-center gap-1",
                          item.status === "ACTIVE" 
                            ? "bg-green-500/10 text-green-500 border-green-500/20" 
                            : "bg-secondary text-muted-foreground border-border"
                        )}>
                          {item.status === "ACTIVE" ? (
                            <Play className="w-2.5 h-2.5 fill-current" />
                          ) : (
                            <Pause className="w-2.5 h-2.5" />
                          )}
                          {item.status === "ACTIVE" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="text-muted-foreground font-mono text-sm">
                          {budget.amount}
                        </div>
                        {budget.type && (
                          <div className="text-[10px] text-muted-foreground/70">
                            {budget.type}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right text-muted-foreground font-mono">
                        {formatMetric(item.spend, "$")}
                      </td>
                      <td className="p-4 text-right text-muted-foreground font-mono">
                        {formatMetric(item.impressions)}
                      </td>
                      <td className="p-4 text-right text-muted-foreground font-mono">
                        {formatMetric(item.cpm, "$")}
                      </td>
                      <td className="p-4 text-right text-muted-foreground font-mono">
                        {formatMetric(item.clicks)}
                      </td>
                      <td className="p-4 text-right text-muted-foreground font-mono">
                        {formatMetric(item.ctr, "", "%")}
                      </td>
                      <td className="p-4 text-right text-muted-foreground font-mono">
                        {formatMetric(item.cpc, "$")}
                      </td>
                      <td className="p-4 text-right">
                        <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-secondary rounded transition-all">
                          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
      
      {/* Footer */}
      <div className="border-t border-border p-2 flex items-center justify-between bg-secondary/5 text-xs text-muted-foreground">
        <div>
          Total: {filteredData.length} {viewLevel}
          {filteredData.length !== (viewLevel === "campaigns" ? campaigns.length : viewLevel === "adsets" ? adSets.length : ads.length) && 
            ` (filtered)`
          }
        </div>
        <div className="flex items-center gap-4">
          {selectedCampaign && (
            <span className="text-muted-foreground/70">
              Campaign: <span className="text-foreground">{selectedCampaign.name}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

