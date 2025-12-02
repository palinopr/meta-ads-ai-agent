"use client";

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

interface DailyData {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  results: number;
  ctr: number;
  cpm: number;
  cpc: number;
  purchase_value: number;
  reach: number;
}

type VolumeMetric = "impressions" | "clicks" | "results" | "reach";

interface VolumeChartProps {
  data: DailyData[];
}

const metricConfig: Record<VolumeMetric, { label: string; color: string }> = {
  impressions: { label: "Impressions", color: "#06B6D4" }, // Cyan
  clicks: { label: "Clicks", color: "#F59E0B" }, // Amber
  results: { label: "Results", color: "#8B5CF6" }, // Purple
  reach: { label: "Reach", color: "#EC4899" }, // Pink
};

export function VolumeChart({ data }: VolumeChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<VolumeMetric>("impressions");

  // Transform data for chart
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((point) => ({
      date: new Date(point.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      value: point[selectedMetric] || 0,
    }));
  }, [data, selectedMetric]);

  // Calculate total for selected metric
  const total = useMemo(() => {
    if (!data || data.length === 0) return 0;
    return data.reduce((sum, d) => sum + (d[selectedMetric] || 0), 0);
  }, [data, selectedMetric]);

  // Format large numbers
  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString();
  };

  const config = metricConfig[selectedMetric];

  if (!data || data.length === 0) {
    return (
      <Card className="bg-white dark:bg-[#242526] border-gray-200 dark:border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-cyan-500" />
            Volume Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center text-gray-500">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-[#242526] border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-cyan-500" />
            Volume Metrics
          </CardTitle>
          
          {/* Total Display */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600 dark:text-gray-400">Total:</span>
            <span 
              className="font-bold text-lg"
              style={{ color: config.color }}
            >
              {formatNumber(total)}
            </span>
          </div>
        </div>
        
        {/* Metric Selector - Pill Buttons */}
        <div className="flex flex-wrap gap-2 mt-3">
          {(Object.entries(metricConfig) as [VolumeMetric, typeof metricConfig[VolumeMetric]][]).map(([key, cfg]) => {
            const isSelected = selectedMetric === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedMetric(key)}
                className={`
                  px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                  flex items-center gap-2 border-2
                  ${isSelected 
                    ? "shadow-sm" 
                    : "bg-transparent border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
                  }
                `}
                style={{
                  color: isSelected ? cfg.color : undefined,
                  backgroundColor: isSelected ? `${cfg.color}15` : undefined,
                  borderColor: isSelected ? cfg.color : undefined,
                }}
              >
                <span 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: cfg.color }}
                />
                {cfg.label}
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradientVolume-${selectedMetric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={config.color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={config.color} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            
            <XAxis 
              dataKey="date" 
              tick={{ fill: "currentColor", fontSize: 11 }}
              className="text-gray-600 dark:text-gray-400"
              angle={-45}
              textAnchor="end"
              height={50}
            />
            
            <YAxis 
              tick={{ fill: "currentColor", fontSize: 11 }}
              tickFormatter={formatNumber}
              className="text-gray-600 dark:text-gray-400"
              width={50}
            />
            
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                border: "none",
                borderRadius: "12px",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
                padding: "12px 16px",
              }}
              formatter={(value: number) => [formatNumber(value), config.label]}
            />
            
            <Area
              type="monotone"
              dataKey="value"
              stroke={config.color}
              strokeWidth={2.5}
              fill={`url(#gradientVolume-${selectedMetric})`}
              isAnimationActive={true}
              animationDuration={800}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

