import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createMetaClient } from "@/lib/meta/client";
import { CampaignTable } from "@/components/dashboard/CampaignTable";
import { 
  CalendarRange, 
  ChevronDown, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Eye,
  MousePointerClick,
  Zap,
  ArrowUpRight
} from "lucide-react";

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

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toLocaleString();
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue,
  gradient 
}: { 
  title: string; 
  value: string; 
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  gradient: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5 transition-all hover:border-primary/30 hover:shadow-lg">
      {/* Gradient Background */}
      <div className={`absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity ${gradient}`} />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl ${gradient} flex items-center justify-center`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          {trend && trendValue && (
            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
              trend === "up" 
                ? "bg-green-500/10 text-green-600 dark:text-green-400" 
                : trend === "down"
                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                : "bg-muted text-muted-foreground"
            }`}>
              {trend === "up" ? <TrendingUp className="w-3 h-3" /> : trend === "down" ? <TrendingDown className="w-3 h-3" /> : null}
              {trendValue}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
        </div>
      </div>
    </div>
  );
}

// Force dynamic rendering to ensure fresh data on each request
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let campaigns: Campaign[] = [];
  let stats = { spend: 0, impressions: 0, clicks: 0 };
  
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      redirect("/login");
    }

    // Use maybeSingle() to gracefully handle 0 rows during account switching
    const { data: metaConnection, error: connectionError } = await supabase
      .from("meta_connections")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (connectionError) {
      console.error("Connection error:", connectionError);
    }

    if (metaConnection?.access_token && metaConnection?.ad_account_id) {
      try {
        const metaClient = createMetaClient(metaConnection.access_token);
        // Ensure account ID has act_ prefix
        const rawAccountId = metaConnection.ad_account_id;
        const accountId = rawAccountId.startsWith("act_") ? rawAccountId : `act_${rawAccountId}`;

        const [campaignsResult, accountInsightsResult, campaignInsightsResult] = await Promise.allSettled([
          metaClient.getCampaigns(accountId),
          metaClient.getAccountInsights(accountId, { date_preset: "last_7d" }),
          metaClient.getAccountInsights(accountId, { date_preset: "last_7d", level: "campaign" })
        ]);

        if (campaignsResult.status === "fulfilled") {
          campaigns = (campaignsResult.value?.data || []) as Campaign[];
        } else {
          console.error("Error fetching campaigns:", campaignsResult.reason);
        }

        if (accountInsightsResult.status === "fulfilled") {
          const insights = accountInsightsResult.value?.data?.[0];
          if (insights) {
            stats = {
              spend: parseFloat(insights.spend || "0"),
              impressions: parseInt(insights.impressions || "0", 10),
              clicks: parseInt(insights.clicks || "0", 10),
            };
          }
        } else {
          console.error("Error fetching account insights:", accountInsightsResult.reason);
        }

        // Merge campaign insights into campaigns
        if (campaignInsightsResult.status === "fulfilled") {
          const campaignInsights = campaignInsightsResult.value?.data || [];
          // Create a map of campaign_id to insights
          const insightsMap = new Map<string, { spend: string; impressions: string; clicks: string; cpm: string; cpc: string; ctr: string }>();
          for (const insight of campaignInsights) {
            // The insight object contains campaign_id from the level=campaign breakdown
            const campaignId = (insight as { campaign_id?: string }).campaign_id;
            if (campaignId) {
              insightsMap.set(campaignId, {
                spend: insight.spend || "0",
                impressions: insight.impressions || "0",
                clicks: insight.clicks || "0",
                cpm: insight.cpm || "0",
                cpc: insight.cpc || "0",
                ctr: insight.ctr || "0",
              });
            }
          }
          // Merge insights into campaigns
          campaigns = campaigns.map(campaign => {
            const insights = insightsMap.get(campaign.id);
            if (insights) {
              return {
                ...campaign,
                spend: insights.spend,
                impressions: insights.impressions,
                clicks: insights.clicks,
                cpm: insights.cpm,
                cpc: insights.cpc,
                ctr: insights.ctr,
              };
            }
            return campaign;
          });
        } else {
          console.error("Error fetching campaign insights:", campaignInsightsResult.reason);
        }
      } catch (e) {
        console.error("Error fetching Meta data:", e);
      }
    }
  } catch (e) {
    console.error("Dashboard page error:", e);
    // Don't throw - render with empty data
  }

  const activeCampaigns = campaigns.filter((c) => c.status === 'ACTIVE').length;
  const ctr = stats.impressions > 0 ? ((stats.clicks / stats.impressions) * 100).toFixed(2) : "0.00";

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background via-background to-accent/5">
      {/* Top Header Bar */}
      <div className="h-16 border-b border-border/50 flex items-center justify-between px-6 bg-background/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-xs text-muted-foreground">
              Welcome back! Here&apos;s your performance overview.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-secondary/50 hover:bg-secondary border border-border/50 rounded-xl text-sm font-medium transition-colors">
            <CalendarRange className="w-4 h-4 text-muted-foreground" />
            <span>Last 7 Days</span>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>
          <button className="p-2.5 text-muted-foreground hover:text-foreground rounded-xl hover:bg-secondary/50 border border-transparent hover:border-border/50 transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard 
            title="Amount Spent" 
            value={`$${stats.spend.toFixed(2)}`} 
            icon={DollarSign}
            trend="up"
            trendValue="+12.5%"
            gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
          />
          <StatCard 
            title="Impressions" 
            value={formatNumber(stats.impressions)} 
            icon={Eye}
            trend="up"
            trendValue="+8.2%"
            gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
          />
          <StatCard 
            title="Clicks" 
            value={formatNumber(stats.clicks)} 
            icon={MousePointerClick}
            trend="up"
            trendValue="+15.3%"
            gradient="bg-gradient-to-br from-violet-500 to-purple-600"
          />
          <StatCard 
            title="Active Campaigns" 
            value={activeCampaigns.toString()} 
            icon={Zap}
            gradient="bg-gradient-to-br from-amber-500 to-orange-600"
          />
        </div>

        {/* Quick Insights Banner */}
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-chart-3/10 to-primary/5 border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Your CTR is {ctr}% this week</p>
                <p className="text-xs text-muted-foreground">
                  {parseFloat(ctr) > 2 
                    ? "Great performance! Your ads are engaging your audience well." 
                    : "Ask AI for tips to improve your click-through rate."}
                </p>
              </div>
            </div>
            <button className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors ai-glow-sm">
              Get AI Insights
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Campaign Table */}
        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Campaigns</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {campaigns.length} total campaigns • {activeCampaigns} active
              </p>
            </div>
          </div>
          <CampaignTable campaigns={campaigns} />
        </div>
      </div>
    </div>
  );
}
