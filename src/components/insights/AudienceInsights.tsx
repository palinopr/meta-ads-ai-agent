"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface AudienceInsightsProps {
  breakdownData: BreakdownData[];
  breakdownType: string;
}

interface BreakdownData {
  dimension: string; // e.g., "18-24", "male", "mobile", "US"
  spend: number;
  impressions: number;
  clicks: number;
  results: number;
  roas: number;
  ctr: number;
  cpm: number;
  cpc: number;
}

const COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
];

export function AudienceInsights({ breakdownData, breakdownType }: AudienceInsightsProps) {
  const [selectedMetric, setSelectedMetric] = useState<"spend" | "results" | "roas" | "ctr">("spend");

  // Validate props - use safe defaults
  const safeBreakdownData = Array.isArray(breakdownData) ? breakdownData : [];

  // Transform data for charts
  const chartData = useMemo(() => {
    if (!safeBreakdownData || safeBreakdownData.length === 0) return [];
    return safeBreakdownData
      .map((item) => ({
        dimension: item.dimension,
        spend: item.spend,
        results: item.results,
        roas: item.roas,
        ctr: item.ctr,
        impressions: item.impressions,
        clicks: item.clicks,
      }))
      .sort((a, b) => b[selectedMetric] - a[selectedMetric])
      .slice(0, 10); // Top 10
  }, [safeBreakdownData, selectedMetric]);

  const pieData = useMemo(() => {
    return chartData.map((item) => ({
      name: item.dimension,
      value: item[selectedMetric],
    }));
  }, [chartData, selectedMetric]);

  const formatMetricValue = (value: number): string => {
    switch (selectedMetric) {
      case "spend":
        return `$${value.toFixed(2)}`;
      case "results":
        return value.toString();
      case "roas":
        return `${value.toFixed(2)}x`;
      case "ctr":
        return `${value.toFixed(2)}%`;
      default:
        return value.toFixed(2);
    }
  };

  const getMetricLabel = (): string => {
    switch (selectedMetric) {
      case "spend":
        return "Spend";
      case "results":
        return "Results";
      case "roas":
        return "ROAS";
      case "ctr":
        return "CTR";
      default:
        return "Spend";
    }
  };

  const getBreakdownLabel = (): string => {
    const labels: Record<string, string> = {
      age: "Age Groups",
      gender: "Gender",
      age_gender: "Age & Gender",
      country: "Countries",
      region: "Regions",
      device_platform: "Device Platform",
      publisher_platform: "Publisher Platform",
      platform_position: "Platform Position",
      hourly_stats_aggregated_by_advertiser_time_zone: "Hour of Day",
      day_of_week: "Day of Week",
    };
    return labels[breakdownType] || breakdownType;
  };

  // Early return after all hooks
  if (safeBreakdownData.length === 0) {
    return (
      <Card className="p-6 bg-white dark:bg-[#1e1f20] border-gray-200 dark:border-gray-800">
        <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
          No breakdown data available. Select a breakdown in the filter panel to see audience insights.
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-white dark:bg-[#1e1f20] border-gray-200 dark:border-gray-800">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Audience Insights - {getBreakdownLabel()}
          </h3>
          <div className="flex gap-2">
            {(["spend", "results", "roas", "ctr"] as const).map((metric) => (
              <Button
                key={metric}
                variant={selectedMetric === metric ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedMetric(metric)}
                className="text-xs capitalize"
              >
                {metric === "roas" ? "ROAS" : metric.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
            {getMetricLabel()} by {getBreakdownLabel()}
          </h4>
          {chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis
                  dataKey="dimension"
                  className="text-gray-600 dark:text-gray-400"
                  tick={{ fill: "currentColor" }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis className="text-gray-600 dark:text-gray-400" tick={{ fill: "currentColor" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => formatMetricValue(value)}
                />
                <Bar dataKey={selectedMetric} fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie Chart */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
            Distribution by {getBreakdownLabel()}
          </h4>
          {pieData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => formatMetricValue(value)}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Summary Table */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          Top Performers
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-4 text-gray-600 dark:text-gray-400">Dimension</th>
                <th className="text-right py-2 px-4 text-gray-600 dark:text-gray-400">Spend</th>
                <th className="text-right py-2 px-4 text-gray-600 dark:text-gray-400">Results</th>
                <th className="text-right py-2 px-4 text-gray-600 dark:text-gray-400">ROAS</th>
                <th className="text-right py-2 px-4 text-gray-600 dark:text-gray-400">CTR</th>
                <th className="text-right py-2 px-4 text-gray-600 dark:text-gray-400">Impressions</th>
              </tr>
            </thead>
            <tbody>
              {chartData.slice(0, 5).map((item, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  <td className="py-2 px-4 font-medium">{item.dimension}</td>
                  <td className="py-2 px-4 text-right">${item.spend.toFixed(2)}</td>
                  <td className="py-2 px-4 text-right">{item.results}</td>
                  <td className="py-2 px-4 text-right">{item.roas.toFixed(2)}x</td>
                  <td className="py-2 px-4 text-right">{item.ctr.toFixed(2)}%</td>
                  <td className="py-2 px-4 text-right">
                    {item.impressions >= 1000
                      ? `${(item.impressions / 1000).toFixed(1)}K`
                      : item.impressions}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}

