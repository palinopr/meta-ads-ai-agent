import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createMetaClient } from "@/lib/meta/client";
import { CampaignTable } from "@/components/dashboard/CampaignTable";
import { CalendarRange, ChevronDown, RefreshCw } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: metaConnection } = await supabase
    .from("meta_connections")
    .select("*")
    .eq("user_id", user.id)
    .single();

  let campaigns = [];
  let stats = { spend: 0, impressions: 0, clicks: 0 };

  if (metaConnection?.access_token) {
    try {
      const metaClient = createMetaClient(metaConnection.access_token);
      const accountId = `act_${metaConnection.ad_account_id}`;
      
      const [campaignsResult, insightsResult] = await Promise.all([
        metaClient.getCampaigns(accountId),
        metaClient.getAccountInsights(accountId, { date_preset: "last_7d" })
      ]);

      campaigns = campaignsResult.data || [];
      
      const insights = insightsResult.data?.[0];
      if (insights) {
        stats = {
            spend: parseFloat(insights.spend || "0"),
            impressions: parseInt(insights.impressions || "0", 10),
            clicks: parseInt(insights.clicks || "0", 10),
        };
      }
    } catch (e) {
      console.error("Error fetching Meta data", e);
    }
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Top Navigation Bar */}
      <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-background sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-2 py-1 hover:bg-secondary/50 rounded cursor-pointer transition-colors">
            <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center text-white text-xs font-bold">
                {metaConnection?.ad_account_name?.[0] || "M"}
            </div>
            <div className="flex flex-col">
                <span className="text-sm font-medium leading-none">
                    {metaConnection?.ad_account_name || "Select Account"}
                </span>
                <span className="text-[10px] text-muted-foreground leading-none mt-0.5">
                    {metaConnection?.ad_account_id || "No account"}
                </span>
            </div>
            <ChevronDown className="w-3 h-3 text-muted-foreground ml-1" />
          </div>
        </div>

        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/20 border border-border rounded-md text-sm">
                <CalendarRange className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Last 7 Days</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground ml-1" />
            </div>
            <button className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary/50">
                <RefreshCw className="w-4 h-4" />
            </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 overflow-hidden flex flex-col">
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-4 flex-shrink-0">
            <div className="p-4 bg-secondary/5 border border-border rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Amount Spent</div>
                <div className="text-xl font-semibold">${stats.spend.toFixed(2)}</div>
            </div>
            <div className="p-4 bg-secondary/5 border border-border rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Impressions</div>
                <div className="text-xl font-semibold">{stats.impressions.toLocaleString()}</div>
            </div>
            <div className="p-4 bg-secondary/5 border border-border rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Clicks</div>
                <div className="text-xl font-semibold">{stats.clicks.toLocaleString()}</div>
            </div>
            <div className="p-4 bg-secondary/5 border border-border rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Active Campaigns</div>
                <div className="text-xl font-semibold">
                    {campaigns.filter((c: any) => c.status === 'ACTIVE').length}
                </div>
            </div>
        </div>

        {/* Campaign Table - Takes remaining space */}
        <div className="flex-1 overflow-hidden min-h-0">
            <CampaignTable campaigns={campaigns} />
        </div>
      </div>
    </div>
  );
}
