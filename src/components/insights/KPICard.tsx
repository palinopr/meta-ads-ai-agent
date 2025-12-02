"use client";

import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { useMemo } from "react";

interface SparklineDataPoint {
  value: number;
  date?: string;
}

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number; // Percentage change
  previousValue?: number; // Previous period value for comparison
  trend?: "up" | "down" | "neutral";
  format?: "currency" | "number" | "percentage" | "decimal";
  icon?: React.ReactNode;
  sparklineData?: SparklineDataPoint[]; // Data for mini sparkline
  tooltip?: string; // Metric explanation tooltip
}

export function KPICard({
  title,
  value,
  change,
  previousValue,
  trend,
  format = "number",
  icon,
  sparklineData,
  tooltip,
}: KPICardProps) {
  const formatValue = (val: string | number, compact = false): string => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    
    if (isNaN(num)) return "—";

    switch (format) {
      case "currency":
        if (compact && num >= 1000) {
          if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
          return `$${(num / 1000).toFixed(1)}K`;
        }
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(num);
      case "percentage":
        return `${num.toFixed(2)}%`;
      case "decimal":
        return num.toFixed(2);
      case "number":
      default:
        if (num >= 1000000) {
          return `${(num / 1000000).toFixed(1)}M`;
        }
        if (num >= 1000) {
          return `${(num / 1000).toFixed(1)}K`;
        }
        return num.toLocaleString();
    }
  };

  // Calculate change if previousValue is provided but change isn't
  const calculatedChange = useMemo(() => {
    if (change !== undefined) return change;
    if (previousValue !== undefined && previousValue !== 0) {
      const currentNum = typeof value === "string" ? parseFloat(value) : value;
      if (!isNaN(currentNum)) {
        return ((currentNum - previousValue) / previousValue) * 100;
      }
    }
    return undefined;
  }, [change, previousValue, value]);

  // Determine trend based on calculated change
  const effectiveTrend = useMemo(() => {
    if (trend) return trend;
    if (calculatedChange !== undefined) {
      if (calculatedChange > 0.5) return "up";
      if (calculatedChange < -0.5) return "down";
      return "neutral";
    }
    return "neutral";
  }, [trend, calculatedChange]);

  const getTrendIcon = () => {
    if (effectiveTrend === "up") {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    }
    if (effectiveTrend === "down") {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getTrendColor = () => {
    if (effectiveTrend === "up") return "text-green-500";
    if (effectiveTrend === "down") return "text-red-500";
    return "text-gray-400";
  };

  const getSparklineColor = () => {
    if (effectiveTrend === "up") return "#22c55e";
    if (effectiveTrend === "down") return "#ef4444";
    return "#3b82f6";
  };

  // Process sparkline data for chart
  const chartData = useMemo(() => {
    if (!sparklineData || sparklineData.length === 0) return null;
    return sparklineData.map((d, i) => ({
      ...d,
      index: i,
    }));
  }, [sparklineData]);

  return (
    <Card className="p-6 bg-white dark:bg-[#1e1f20] border-gray-200 dark:border-gray-800 hover:shadow-lg transition-all duration-300 animate-scale-up group">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Header with icon and title */}
          <div className="flex items-center gap-2 mb-3">
            {icon && (
              <div className="text-gray-500 dark:text-gray-400 group-hover:text-blue-500 transition-colors">
                {icon}
              </div>
            )}
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
              {title}
            </p>
            {tooltip && (
              <div className="relative group/tooltip">
                <Info className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 w-48 z-50">
                  {tooltip}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
                </div>
              </div>
            )}
          </div>

          {/* Main value */}
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2 animate-count">
            {formatValue(value)}
          </p>

          {/* Change indicator */}
          {calculatedChange !== undefined && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className={`flex items-center gap-1 text-sm font-medium ${getTrendColor()}`}>
                {getTrendIcon()}
                <span>{Math.abs(calculatedChange).toFixed(1)}%</span>
              </div>
              {previousValue !== undefined && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  vs {formatValue(previousValue, true)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Sparkline Chart */}
        {chartData && chartData.length > 1 && (
          <div className="w-20 h-12 flex-shrink-0 ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const data = payload[0].payload as SparklineDataPoint & { index: number };
                      return (
                        <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded shadow-lg">
                          {data.date && <div className="text-gray-300 mb-0.5">{data.date}</div>}
                          <div className="font-medium">{formatValue(data.value)}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={getSparklineColor()}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3, fill: getSparklineColor() }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}
