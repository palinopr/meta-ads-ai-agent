"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Search, Filter, Columns, Download, MoreHorizontal, ArrowUpDown, ArrowUp, ArrowDown, X } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  status: string;
  delivery_status?: string;
  daily_budget?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
}

type SortConfig = {
  key: keyof Campaign | 'amount_spent'; // 'amount_spent' maps to 'spend' but handled custom
  direction: 'asc' | 'desc';
} | null;

export function CampaignTable({ campaigns }: { campaigns: Campaign[] }) {
  const [selectedTab, setSelectedTab] = useState<"campaigns" | "adsets" | "ads">("campaigns");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "PAUSED">("ALL");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Memoized filtered and sorted campaigns
  const filteredCampaigns = useMemo(() => {
    let result = [...campaigns];

    // 1. Filter by Status
    if (statusFilter !== "ALL") {
      result = result.filter(c => 
        statusFilter === "ACTIVE" ? c.status === "ACTIVE" : c.status !== "ACTIVE"
      );
    }

    // 2. Filter by Search Query
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(lowerQuery) || 
        c.id.includes(lowerQuery)
      );
    }

    // 3. Sort
    if (sortConfig) {
      result.sort((a, b) => {
        let aValue: string | number = a[sortConfig.key as keyof Campaign] ?? "";
        let bValue: string | number = b[sortConfig.key as keyof Campaign] ?? "";

        // Handle numeric values explicitly
        if (['daily_budget', 'spend', 'impressions', 'clicks', 'cpc', 'ctr'].includes(sortConfig.key)) {
             aValue = parseFloat(String(aValue) || "0");
             bValue = parseFloat(String(bValue) || "0");
        }
        
        // Handle custom mapping if needed (e.g., amount_spent -> spend)
        if (sortConfig.key === 'amount_spent') {
             aValue = parseFloat(a.spend || "0");
             bValue = parseFloat(b.spend || "0");
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [campaigns, searchQuery, sortConfig, statusFilter]);

  const handleSort = (key: keyof Campaign | 'amount_spent') => {
    setSortConfig(current => {
      if (current?.key === key) {
        return current.direction === 'asc' 
          ? { key, direction: 'desc' } 
          : null; // Toggle off if descending
      }
      return { key, direction: 'asc' };
    });
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />;
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-border p-2 flex items-center justify-between bg-secondary/5">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 text-sm bg-background border border-border rounded-md w-64 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
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
                        <button onClick={() => { setStatusFilter("ALL"); setIsFilterOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-secondary/50 transition-colors">All Campaigns</button>
                        <button onClick={() => { setStatusFilter("ACTIVE"); setIsFilterOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-secondary/50 transition-colors">Active Only</button>
                        <button onClick={() => { setStatusFilter("PAUSED"); setIsFilterOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-secondary/50 transition-colors">Inactive Only</button>
                    </div>
                </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors shadow-sm">
            + Create
          </button>
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
          onClick={() => setSelectedTab("campaigns")}
          className={cn(
            "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
            selectedTab === "campaigns" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Campaigns
        </button>
        <button 
          onClick={() => setSelectedTab("adsets")}
          className={cn(
            "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
            selectedTab === "adsets" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Ad Sets
        </button>
        <button 
          onClick={() => setSelectedTab("ads")}
          className={cn(
            "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
            selectedTab === "ads" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Ads
        </button>
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse relative">
          <thead className="bg-secondary/10 sticky top-0 z-10 text-xs font-semibold text-muted-foreground uppercase tracking-wider backdrop-blur-sm">
            <tr>
              <th className="p-4 border-b border-border w-10 bg-secondary/5">
                <input type="checkbox" className="rounded border-border bg-background" />
              </th>
              <th className="p-4 border-b border-border w-12 bg-secondary/5">Off/On</th>
              
              <th 
                className="p-4 border-b border-border min-w-[200px] cursor-pointer hover:bg-secondary/10 group bg-secondary/5 transition-colors"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                    Campaign Name
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
                onClick={() => handleSort('amount_spent')}
              >
                <div className="flex items-center justify-end gap-1">
                    Amount Spent
                    <SortIcon columnKey="amount_spent" />
                </div>
              </th>
              
              <th 
                className="p-4 border-b border-border text-right cursor-pointer hover:bg-secondary/10 group bg-secondary/5 transition-colors"
                onClick={() => handleSort('impressions')}
              >
                <div className="flex items-center justify-end gap-1">
                    Impressions
                    <SortIcon columnKey="impressions" />
                </div>
              </th>
              
              <th className="p-4 border-b border-border text-right bg-secondary/5">CPM</th>
              
              <th 
                className="p-4 border-b border-border text-right cursor-pointer hover:bg-secondary/10 group bg-secondary/5 transition-colors"
                onClick={() => handleSort('clicks')}
              >
                <div className="flex items-center justify-end gap-1">
                    Clicks
                    <SortIcon columnKey="clicks" />
                </div>
              </th>
              
              <th className="p-4 border-b border-border w-10 bg-secondary/5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredCampaigns.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                        <Search className="w-8 h-8 text-muted-foreground/50" />
                        <p>No campaigns found matching your filters.</p>
                        <button 
                            onClick={() => { setSearchQuery(""); setStatusFilter("ALL"); }}
                            className="text-primary hover:underline text-sm"
                        >
                            Clear all filters
                        </button>
                    </div>
                </td>
              </tr>
            ) : (
              filteredCampaigns.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-secondary/5 transition-colors group text-sm">
                  <td className="p-4">
                    <input type="checkbox" className="rounded border-border bg-background" />
                  </td>
                  <td className="p-4">
                    <button className="text-muted-foreground hover:text-primary transition-colors">
                      {campaign.status === "ACTIVE" ? (
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
                  <td className="p-4 font-medium text-foreground group-hover:text-primary cursor-pointer">
                    {campaign.name}
                    <div className="text-[10px] text-muted-foreground font-normal mt-0.5">ID: {campaign.id}</div>
                  </td>
                  <td className="p-4">
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full border",
                      campaign.status === "ACTIVE" 
                        ? "bg-green-500/10 text-green-500 border-green-500/20" 
                        : "bg-secondary text-muted-foreground border-border"
                    )}>
                      {campaign.status === "ACTIVE" ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-4 text-right text-muted-foreground font-mono">
                    {campaign.daily_budget 
                      ? `$${(parseInt(campaign.daily_budget) / 100).toFixed(2)}` 
                      : "—"}
                  </td>
                  <td className="p-4 text-right text-muted-foreground font-mono">
                    {campaign.spend ? `$${parseFloat(campaign.spend).toFixed(2)}` : "—"}
                  </td>
                  <td className="p-4 text-right text-muted-foreground font-mono">
                    {campaign.impressions ? parseInt(campaign.impressions).toLocaleString() : "—"}
                  </td>
                  <td className="p-4 text-right text-muted-foreground font-mono">
                    —
                  </td>
                  <td className="p-4 text-right text-muted-foreground font-mono">
                    {campaign.clicks ? parseInt(campaign.clicks).toLocaleString() : "—"}
                  </td>
                  <td className="p-4 text-right">
                    <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-secondary rounded transition-all">
                      <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Footer / Pagination */}
      <div className="border-t border-border p-2 flex items-center justify-between bg-secondary/5 text-xs text-muted-foreground">
        <div>
            Total: {filteredCampaigns.length} campaigns
            {filteredCampaigns.length !== campaigns.length && ` (filtered from ${campaigns.length})`}
        </div>
        <div className="flex gap-2">
            <span>Rows per page: 50</span>
        </div>
      </div>
    </div>
  );
}
