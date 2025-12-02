"use client";

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge } from "lucide-react";

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
  reach?: number;
  roas?: number;
}

type EfficiencyMetric = "roas" | "ctr" | "cpc" | "cpm";

interface EfficiencyChartProps {
  data: DailyData[];
}

const metricConfig: Record<EfficiencyMetric, { 
  label: string; 
  color: string; 
  format: (val: number) => string;
  refLine?: { value: number; label: string; color: string };
}> = {
  roas: { 
    label: "ROAS", 
    color: "#22C55E", // Green
    format: (val) => `${val.toFixed(2)}x`,
    refLine: { value: 1, label: "Break-even", color: "#EF4444" }
  },
  ctr: { 
    label: "CTR", 
    color: "#3B82F6", // Blue
    format: (val) => `${val.toFixed(2)}%`,
    refLine: { value: 1, label: "1% Benchmark", color: "#F59E0B" }
  },
  cpc: { 
    label: "CPC", 
    color: "#F59E0B", // Amber
    format: (val) => `$${val.toFixed(2)}`,
  },
  cpm: { 
    label: "CPM", 
    color: "#8B5CF6", // Purple
    format: (val) => `$${val.toFixed(2)}`,
  },
};

export function EfficiencyChart({ data }: EfficiencyChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<EfficiencyMetric>("roas");

  // Transform data for chart
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((point) => {
      let value = 0;
      if (selectedMetric === "roas") {
        value = point.spend > 0 ? point.purchase_value / point.spend : 0;
      } else {
        value = point[selectedMetric] || 0;
      }
      return {
        date: new Date(point.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        value,
      };
    });
  }, [data, selectedMetric]);

  // Calculate average for selected metric
  const average = useMemo(() => {
    if (!data || data.length === 0) return 0;
    if (selectedMetric === "roas") {
      const totalSpend = data.reduce((sum, d) => sum + (d.spend || 0), 0);
      const totalRevenue = data.reduce((sum, d) => sum + (d.purchase_value || 0), 0);
      return totalSpend > 0 ? totalRevenue / totalSpend : 0;
    }
    const sum = data.reduce((acc, d) => acc + (d[selectedMetric] || 0), 0);
    return sum / data.length;
  }, [data, selectedMetric]);

  const config = metricConfig[selectedMetric];

  if (!data || data.length === 0) {
    return (
      <Card className="bg-white dark:bg-[#242526] border-gray-200 dark:border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Gauge className="h-5 w-5 text-green-500" />
            Efficiency Metrics
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
            <Gauge className="h-5 w-5 text-green-500" />
            Efficiency Metrics
          </CardTitle>
          
          {/* Average Display */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600 dark:text-gray-400">Avg:</span>
            <span 
              className="font-bold text-lg"
              style={{ color: config.color }}
            >
              {config.format(average)}
            </span>
            {selectedMetric === "roas" && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                average >= 1 
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              }`}>
                {average >= 1 ? "Profitable" : "Below break-even"}
              </span>
            )}
          </div>
        </div>
        
        {/* Metric Selector - Pill Buttons */}
        <div className="flex flex-wrap gap-2 mt-3">
          {(Object.entries(metricConfig) as [EfficiencyMetric, typeof metricConfig[EfficiencyMetric]][]).map(([key, cfg]) => {
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
              <linearGradient id={`gradientEfficiency-${selectedMetric}`} x1="0" y1="0" x2="0" y2="1">
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
              tickFormatter={(value) => config.format(value)}
              className="text-gray-600 dark:text-gray-400"
              width={55}
            />
            
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                border: "none",
                borderRadius: "12px",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
                padding: "12px 16px",
              }}
              formatter={(value: number) => [config.format(value), config.label]}
            />
            
            {/* Reference Line for benchmarks */}
            {config.refLine && (
              <ReferenceLine 
                y={config.refLine.value} 
                stroke={config.refLine.color}
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{
                  value: config.refLine.label,
                  position: "right",
                  fill: config.refLine.color,
                  fontSize: 11,
                }}
              />
            )}
            
            <Area
              type="monotone"
              dataKey="value"
              stroke={config.color}
              strokeWidth={2.5}
              fill={`url(#gradientEfficiency-${selectedMetric})`}
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

