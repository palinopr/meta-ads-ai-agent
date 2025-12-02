import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Client } from "@langchain/langgraph-sdk";

// LangGraph Cloud configuration
const LANGGRAPH_URL = process.env.LANGGRAPH_DEPLOYMENT_URL || "https://meta-ads-ai-prod-181ea4f5bba65af69e75dbfc05c3df0d.us.langgraph.app";
const LANGGRAPH_API_KEY = process.env.LANGGRAPH_API_KEY || process.env.LANGCHAIN_API_KEY;
const GRAPH_NAME = "meta_ads_agent";

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
  results: number;
  roas: number;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { summary, dailyData } = await request.json() as {
      summary: InsightsSummary;
      dailyData: DailyDataPoint[];
    };

    if (!summary || !dailyData) {
      return NextResponse.json({ error: "Summary and dailyData required" }, { status: 400 });
    }

    // Get Meta connection
    const { data: connection } = await supabase
      .from("meta_connections")
      .select("access_token, ad_account_id, token_expires_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!connection) {
      return NextResponse.json({ error: "No Meta connection found" }, { status: 404 });
    }

    if (new Date(connection.token_expires_at) < new Date()) {
      return NextResponse.json({ error: "Token expired" }, { status: 400 });
    }

    // Create LangGraph Cloud client
    const client = new Client({
      apiUrl: LANGGRAPH_URL,
      apiKey: LANGGRAPH_API_KEY,
    });

    // Create a temporary thread for this analysis
    const thread = await client.threads.create();

    // Prepare analysis prompt with insights data
    const analysisPrompt = `Analyze the following Meta Ads performance data and generate actionable insights, predictions, and recommendations.

PERFORMANCE SUMMARY:
- Total Spend: $${summary.spend.toFixed(2)}
- Impressions: ${summary.impressions.toLocaleString()}
- Clicks: ${summary.clicks.toLocaleString()}
- Results (Conversions): ${summary.results}
- Purchase Value: $${summary.purchase_value.toFixed(2)}
- ROAS: ${summary.roas.toFixed(2)}x
- CTR: ${summary.ctr.toFixed(2)}%
- CPM: $${summary.cpm.toFixed(2)}
- CPC: $${summary.cpc.toFixed(2)}
- Cost per Result: $${summary.cost_per_result.toFixed(2)}

RECENT TREND DATA (Last ${dailyData.length} days):
${dailyData.map((d) => 
  `- ${d.date}: Spend $${d.spend.toFixed(2)}, Results ${d.results}, ROAS ${d.roas.toFixed(2)}x`
).join("\n")}

Please analyze this data and provide:
1. **Automated Insights**: Key observations about performance (e.g., "Your CPM decreased 12% - likely due to improved ad relevance")
2. **Predictions**: Future trends based on current data (e.g., "At current spend rate, you'll reach $50K by month-end")
3. **Recommendations**: Actionable suggestions (e.g., "Scale Campaign X - it has lowest CPC")
4. **Anomaly Detection**: Unusual patterns that need investigation (e.g., "Unusual spike in CPC detected")

Format your response as a JSON array of insights, each with:
- type: "insight" | "prediction" | "recommendation" | "anomaly"
- priority: "high" | "medium" | "low"
- title: Short title (max 60 chars)
- description: Detailed explanation (2-3 sentences)
- metric: Optional metric name (e.g., "CPM", "ROAS")
- value: Optional metric value
- change: Optional percentage change

Return ONLY valid JSON array, no markdown or extra text. Example format:
[
  {
    "type": "insight",
    "priority": "medium",
    "title": "CPM Decreased 12%",
    "description": "Your CPM decreased 12% this week compared to last week. This is likely due to improved ad relevance and better audience targeting.",
    "metric": "CPM",
    "value": "$${summary.cpm.toFixed(2)}",
    "change": -12
  }
]`;

    try {
      // Call LangGraph Cloud
      const streamResponse = client.runs.stream(
        thread.thread_id,
        GRAPH_NAME,
        {
          input: {
            messages: [{ role: "user", content: analysisPrompt }],
            accessToken: connection.access_token,
            adAccountId: connection.ad_account_id,
            userId: user.id,
          },
          streamMode: "messages",
        }
      );

      let fullResponse = "";
      for await (const chunk of streamResponse) {
        const event = chunk.event;
        const data = chunk.data;

        if (event === "messages/complete") {
          continue;
        }

        if (Array.isArray(data)) {
          for (const msg of data) {
            const msgType = msg.type || msg._getType?.() || "";
            const content = msg.content;

            if (
              (msgType === "ai" || msgType === "AIMessage" || msgType === "AIMessageChunk") &&
              typeof content === "string" &&
              content
            ) {
              fullResponse = content;
            }
          }
        }
      }

      // Parse JSON from response (may be wrapped in markdown code blocks)
      let insightsJson = fullResponse.trim();
      
      // Remove markdown code blocks if present
      if (insightsJson.startsWith("```json")) {
        insightsJson = insightsJson.replace(/^```json\n?/, "").replace(/\n?```$/, "");
      } else if (insightsJson.startsWith("```")) {
        insightsJson = insightsJson.replace(/^```\n?/, "").replace(/\n?```$/, "");
      }

      // Try to extract JSON array from response if it's embedded in text
      const jsonMatch = insightsJson.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        insightsJson = jsonMatch[0];
      }

      let insights: Array<{
        type: "insight" | "prediction" | "recommendation" | "anomaly";
        priority: "high" | "medium" | "low";
        title: string;
        description: string;
        metric?: string;
        value?: number | string;
        change?: number;
      }> = [];

      try {
        insights = JSON.parse(insightsJson);
      } catch (parseError) {
        console.error("Failed to parse AI response as JSON:", parseError);
        console.error("Response was:", fullResponse);
        
        // Fallback: Generate basic insights from data
        insights = generateFallbackInsights(summary, dailyData);
      }

      // Add IDs and ensure valid structure
      const formattedInsights = insights.slice(0, 10).map((insight, index) => ({
        id: `insight-${Date.now()}-${index}`,
        type: insight.type || "insight",
        priority: insight.priority || "medium",
        title: insight.title || "Performance Insight",
        description: insight.description || "",
        metric: insight.metric,
        value: insight.value,
        change: insight.change,
        dismissible: true,
      }));

      return NextResponse.json({ insights: formattedInsights });
    } catch (error) {
      console.error("Error calling LangGraph:", error);
      
      // Fallback to rule-based insights if AI fails
      const fallbackInsights = generateFallbackInsights(summary, dailyData);
      return NextResponse.json({ insights: fallbackInsights });
    }
  } catch (error) {
    console.error("Error generating AI insights:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate insights" },
      { status: 500 }
    );
  }
}

/**
 * Generate fallback insights using rule-based analysis
 */
function generateFallbackInsights(
  summary: InsightsSummary,
  dailyData: DailyDataPoint[]
): Array<{
  id: string;
  type: "insight" | "prediction" | "recommendation" | "anomaly";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  metric?: string;
  value?: number | string;
  change?: number;
  dismissible: boolean;
}> {
  const insights: Array<{
    id: string;
    type: "insight" | "prediction" | "recommendation" | "anomaly";
    priority: "high" | "medium" | "low";
    title: string;
    description: string;
    metric?: string;
    value?: number | string;
    change?: number;
    dismissible: boolean;
  }> = [];

  // ROAS analysis
  if (summary.roas >= 3) {
    insights.push({
      id: `insight-${Date.now()}-1`,
      type: "insight",
      priority: "high",
      title: "Excellent ROAS Performance",
      description: `Your ROAS is ${summary.roas.toFixed(2)}x, which is excellent. This indicates strong return on ad spend. Consider scaling successful campaigns.`,
      metric: "ROAS",
      value: `${summary.roas.toFixed(2)}x`,
      dismissible: true,
    });
  } else if (summary.roas < 1) {
    insights.push({
      id: `insight-${Date.now()}-2`,
      type: "recommendation",
      priority: "high",
      title: "ROAS Below Break-Even",
      description: `Your ROAS is ${summary.roas.toFixed(2)}x, which is below break-even. Review targeting, ad creative, and bidding strategy to improve performance.`,
      metric: "ROAS",
      value: `${summary.roas.toFixed(2)}x`,
      dismissible: true,
    });
  }

  // CTR analysis
  if (summary.ctr > 2) {
    insights.push({
      id: `insight-${Date.now()}-3`,
      type: "insight",
      priority: "medium",
      title: "Strong Click-Through Rate",
      description: `Your CTR of ${summary.ctr.toFixed(2)}% is above average. This suggests your ad creative and targeting are resonating well with your audience.`,
      metric: "CTR",
      value: `${summary.ctr.toFixed(2)}%`,
      dismissible: true,
    });
  } else if (summary.ctr < 0.5) {
    insights.push({
      id: `insight-${Date.now()}-4`,
      type: "recommendation",
      priority: "medium",
      title: "Low Click-Through Rate",
      description: `Your CTR of ${summary.ctr.toFixed(2)}% is below average. Consider refreshing ad creative or refining your audience targeting.`,
      metric: "CTR",
      value: `${summary.ctr.toFixed(2)}%`,
      dismissible: true,
    });
  }

  // Trend analysis
  if (dailyData.length >= 7) {
    const recentData = dailyData.slice(-7);
    const olderData = dailyData.slice(-14, -7);
    
    if (olderData.length > 0) {
      const recentAvgSpend = recentData.reduce((sum, d) => sum + d.spend, 0) / recentData.length;
      const olderAvgSpend = olderData.reduce((sum, d) => sum + d.spend, 0) / olderData.length;
      
      if (recentAvgSpend > olderAvgSpend * 1.2) {
        insights.push({
          id: `insight-${Date.now()}-5`,
          type: "insight",
          priority: "medium",
          title: "Spend Increased This Week",
          description: `Your average daily spend increased ${((recentAvgSpend / olderAvgSpend - 1) * 100).toFixed(0)}% compared to last week. Monitor performance to ensure ROAS remains strong.`,
          metric: "Spend",
          value: `$${recentAvgSpend.toFixed(2)}/day`,
          change: ((recentAvgSpend / olderAvgSpend - 1) * 100),
          dismissible: true,
        });
      }
    }
  }

  // Cost per result analysis
  if (summary.cost_per_result > 50 && summary.results > 0) {
    insights.push({
      id: `insight-${Date.now()}-6`,
      type: "recommendation",
      priority: "high",
      title: "High Cost Per Result",
      description: `Your cost per result is $${summary.cost_per_result.toFixed(2)}, which may be high depending on your product margins. Consider optimizing targeting or ad creative to reduce costs.`,
      metric: "Cost per Result",
      value: `$${summary.cost_per_result.toFixed(2)}`,
      dismissible: true,
    });
  }

  // Results volume analysis
  if (summary.results === 0 && summary.spend > 100) {
    insights.push({
      id: `insight-${Date.now()}-7`,
      type: "anomaly",
      priority: "high",
      title: "No Conversions Despite Spend",
      description: `You've spent $${summary.spend.toFixed(2)} but have no conversions. This requires immediate attention - review your conversion tracking, landing page, and targeting.`,
      metric: "Results",
      value: "0",
      dismissible: true,
    });
  }

  return insights.slice(0, 6); // Limit to 6 insights
}

