"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Search, Filter, Columns, Download, MoreHorizontal } from "lucide-react";

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

export function CampaignTable({ campaigns }: { campaigns: Campaign[] }) {
  const [selectedTab, setSelectedTab] = useState<"campaigns" | "adsets" | "ads">("campaigns");

  return (
    <div className="flex flex-col h-full bg-background border border-border rounded-lg overflow-hidden shadow-sm">
      {/* Toolbar */}
      <div className="border-b border-border p-2 flex items-center justify-between bg-secondary/5">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="pl-9 pr-4 py-1.5 text-sm bg-background border border-border rounded-md w-64 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground border border-transparent hover:bg-secondary/50 rounded-md transition-colors">
            <Filter className="w-4 h-4" />
            Filter
          </button>
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
        <table className="w-full text-left border-collapse">
          <thead className="bg-secondary/10 sticky top-0 z-10 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="p-4 border-b border-border w-10">
                <input type="checkbox" className="rounded border-border bg-background" />
              </th>
              <th className="p-4 border-b border-border w-12">Off/On</th>
              <th className="p-4 border-b border-border min-w-[200px]">Campaign Name</th>
              <th className="p-4 border-b border-border">Delivery</th>
              <th className="p-4 border-b border-border text-right">Budget</th>
              <th className="p-4 border-b border-border text-right">Amount Spent</th>
              <th className="p-4 border-b border-border text-right">Impressions</th>
              <th className="p-4 border-b border-border text-right">CPM</th>
              <th className="p-4 border-b border-border text-right">Clicks</th>
              <th className="p-4 border-b border-border w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-12 text-center text-muted-foreground">
                  No campaigns found. Use the AI to create one!
                </td>
              </tr>
            ) : (
              campaigns.map((campaign) => (
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
                  <td className="p-4 text-right text-muted-foreground">
                    {campaign.daily_budget 
                      ? `$${(parseInt(campaign.daily_budget) / 100).toFixed(2)}` 
                      : "—"}
                  </td>
                  <td className="p-4 text-right text-muted-foreground">
                    {campaign.spend ? `$${parseFloat(campaign.spend).toFixed(2)}` : "—"}
                  </td>
                  <td className="p-4 text-right text-muted-foreground">
                    {campaign.impressions || "—"}
                  </td>
                  <td className="p-4 text-right text-muted-foreground">
                    —
                  </td>
                  <td className="p-4 text-right text-muted-foreground">
                    {campaign.clicks || "—"}
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
        <div>Total: {campaigns.length} campaigns</div>
        <div className="flex gap-2">
            <span>Rows per page: 50</span>
        </div>
      </div>
    </div>
  );
}

