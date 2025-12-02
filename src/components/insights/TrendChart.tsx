"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  ReferenceLine,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface DailyDataPoint {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  cpm: number;
  cpc: number;
  ctr: number;
  results: number;
  purchase_value: number;
}

interface TrendChartProps {
  data: DailyDataPoint[];
  previousData?: DailyDataPoint[]; // For comparison mode
  dateRange: string;
  onDateRangeChange: (range: string) => void;
  breakdownData?: Array<{
    dimension: string;
    date: string;
    spend: number;
    impressions: number;
    clicks: number;
    results: number;
    roas: number;
  }>;
  breakdownType?: string;
  onComparisonModeChange?: (enabled: boolean) => void;
}

type Metric = "spend" | "impressions" | "clicks" | "results" | "roas";

const metricConfig: Record<
  Metric,
  { label: string; color: string; format: (val: number) => string }
> = {
  spend: {
    label: "Spend",
    color: "#3B82F6",
    format: (val) => `$${val.toFixed(0)}`,
  },
  impressions: {
    label: "Impressions",
    color: "#10B981",
    format: (val) => {
      if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
      if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
      return val.toString();
    },
  },
  clicks: {
    label: "Clicks",
    color: "#F59E0B",
    format: (val) => {
      if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
      return val.toString();
    },
  },
  results: {
    label: "Results",
    color: "#8B5CF6",
    format: (val) => val.toString(),
  },
  roas: {
    label: "ROAS",
    color: "#EF4444",
    format: (val) => `${val.toFixed(2)}x`,
  },
};

// Anomaly detection: detect outliers using IQR method
function detectAnomalies(
  values: number[],
  dates: string[],
  threshold: number = 1.5
): Array<{ date: string; value: number; metric: string }> {
  if (values.length < 4) return [];

  const sorted = [...values].sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  if (!q1 || !q3) return [];
  const iqr = q3 - q1;
  const lowerBound = q1 - threshold * iqr;
  const upperBound = q3 + threshold * iqr;

  const anomalies: Array<{ date: string; value: number; metric: string }> = [];
  values.forEach((value, index) => {
    const date = dates[index];
    if (date && (value < lowerBound || value > upperBound)) {
      anomalies.push({
        date,
        value,
        metric: "anomaly",
      });
    }
  });

  return anomalies;
}

export function TrendChart({
  data,
  previousData,
  dateRange,
  onDateRangeChange,
  breakdownData,
  breakdownType,
  onComparisonModeChange,
}: TrendChartProps) {
  const [selectedMetrics, setSelectedMetrics] = useState<Metric[]>(["spend", "results"]);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [showBreakdowns, setShowBreakdowns] = useState(false);

  // Validate data prop - use safe defaults with useMemo to avoid dependency issues
  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const safePreviousData = useMemo(() => (Array.isArray(previousData) ? previousData : []), [previousData]);

  const handleComparisonToggle = (enabled: boolean) => {
    setComparisonMode(enabled);
    if (onComparisonModeChange) {
      onComparisonModeChange(enabled);
    }
  };

  const dateRanges = [
    "Today",
    "Yesterday",
    "Last 7 Days",
    "Last 30 Days",
    "Last 90 Days",
    "This Month",
    "Last Month",
    "Maximum",
  ];

  // Transform data for chart (calculate ROAS per day)
  const chartData = useMemo(() => {
    if (!safeData || safeData.length === 0) return [];
    return safeData.map((point) => ({
      ...point,
      date: new Date(point.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      dateFull: point.date, // Keep full date for sorting/filtering
      roas: point.spend > 0 ? point.purchase_value / point.spend : 0,
    }));
  }, [safeData]);

  // Transform previous period data for comparison
  const previousChartData = useMemo(() => {
    if (!safePreviousData || safePreviousData.length === 0 || !comparisonMode) return [];
    return safePreviousData.map((point) => ({
      ...point,
      date: new Date(point.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      dateFull: point.date,
      roas: point.spend > 0 ? point.purchase_value / point.spend : 0,
    }));
  }, [safePreviousData, comparisonMode]);

  // Process breakdown data if enabled
  const breakdownChartData = useMemo(() => {
    if (!showBreakdowns || !breakdownData || !breakdownType) return [];
    
    // Group breakdown data by date and dimension
    const grouped = new Map<string, Map<string, typeof breakdownData[0]>>();
    
    breakdownData.forEach((item) => {
      const dateKey = new Date(item.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, new Map());
      }
      
      const dateMap = grouped.get(dateKey)!;
      dateMap.set(item.dimension, item);
    });

    // Convert to chart format
    const result: Array<Record<string, number | string>> = [];
    grouped.forEach((dateMap, date) => {
      const row: Record<string, number | string> = { date };
      dateMap.forEach((item, dimension) => {
        selectedMetrics.forEach((metric) => {
          const key = `${dimension}_${metric}`;
          row[key] = item[metric] || 0;
        });
      });
      result.push(row);
    });

    return result;
  }, [breakdownData, breakdownType, showBreakdowns, selectedMetrics]);

  // Detect anomalies for selected metrics
  const anomalies = useMemo(() => {
    if (!comparisonMode && chartData.length > 0) {
      const allAnomalies: Array<{ date: string; value: number; metric: string }> = [];
      
      selectedMetrics.forEach((metric) => {
        const values = chartData.map((d) => d[metric] as number);
        const dates = chartData.map((d) => d.date);
        const metricAnomalies = detectAnomalies(values, dates);
        allAnomalies.push(...metricAnomalies.map((a) => ({ ...a, metric })));
      });

      return allAnomalies;
    }
    return [];
  }, [chartData, selectedMetrics, comparisonMode]);

  const toggleMetric = (metric: Metric) => {
    setSelectedMetrics((prev) =>
      prev.includes(metric) ? prev.filter((m) => m !== metric) : [...prev, metric]
    );
  };

  // Determine which data to use
  const baseDisplayData = showBreakdowns && breakdownChartData.length > 0 
    ? breakdownChartData 
    : chartData;

  // For single data point, duplicate it to make line chart render properly
  // Recharts needs at least 2 points to draw a line
  const displayData = useMemo(() => {
    if (baseDisplayData.length === 1 && baseDisplayData[0]) {
      // Duplicate the single point to create a visible line segment
      const singlePoint = baseDisplayData[0];
      return [
        { ...singlePoint, date: singlePoint.date },
        { ...singlePoint, date: singlePoint.date }
      ];
    }
    return baseDisplayData;
  }, [baseDisplayData]);

  return (
    <Card className="p-6 bg-white dark:bg-[#1e1f20] border-gray-200 dark:border-gray-800">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Performance Trends
          </h3>
          <div className="flex gap-2">
            {dateRanges.map((range) => (
              <Button
                key={range}
                variant={dateRange === range ? "default" : "outline"}
                size="sm"
                onClick={() => onDateRangeChange(range)}
                className="text-xs"
              >
                {range}
              </Button>
            ))}
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          {/* Metric Toggles */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(metricConfig).map(([key, config]) => {
              const metric = key as Metric;
              const isSelected = selectedMetrics.includes(metric);
              return (
                <button
                  key={metric}
                  onClick={() => toggleMetric(metric)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    isSelected
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {config.label}
                </button>
              );
            })}
          </div>

          {/* Comparison Mode Toggle */}
          <button
            onClick={() => handleComparisonToggle(!comparisonMode)}
            disabled={!previousData || previousData.length === 0}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              comparisonMode
                ? "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            } ${(!previousData || previousData.length === 0) ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {comparisonMode ? "✓ Compare" : "Compare"}
          </button>

          {/* Breakdown Toggle */}
          {breakdownData && breakdownData.length > 0 && breakdownType && (
            <button
              onClick={() => setShowBreakdowns(!showBreakdowns)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                showBreakdowns
                  ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {showBreakdowns ? `✓ ${breakdownType}` : `Show ${breakdownType}`}
            </button>
          )}
        </div>

        {/* Anomaly Alert */}
        {anomalies.length > 0 && !comparisonMode && (
          <div className="mb-4 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-md">
            <AlertCircle className="h-4 w-4" />
            <span>
              {anomalies.length} anomaly{anomalies.length > 1 ? "ies" : ""} detected - unusual
              performance patterns identified
            </span>
          </div>
        )}
      </div>

      {!safeData || safeData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <p className="mb-2">No data available for the selected date range</p>
            <p className="text-sm text-gray-400">Try selecting a different date range or check your campaign filters</p>
          </div>
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <p className="mb-2">Processing chart data...</p>
            <p className="text-sm text-gray-400">Please wait</p>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={450}>
          <LineChart 
            data={displayData} 
            margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis
              dataKey="date"
              className="text-gray-600 dark:text-gray-400"
              tick={{ fill: "currentColor" }}
              angle={baseDisplayData.length === 1 ? 0 : -45}
              textAnchor={baseDisplayData.length === 1 ? "middle" : "end"}
              height={60}
            />
            <YAxis 
              className="text-gray-600 dark:text-gray-400" 
              tick={{ fill: "currentColor" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
              }}
              formatter={(value: number, name: string) => {
                try {
                  // Handle breakdown data keys (e.g., "18-24_spend")
                  if (name.includes("_")) {
                    const [dimension, metric] = name.split("_");
                    const config = metricConfig[metric as Metric];
                    return config
                      ? [config.format(value), `${dimension} ${config.label}`]
                      : [value, name];
                  }
                  const metric = name.toLowerCase().replace(" (previous)", "") as Metric;
                  const config = metricConfig[metric];
                  return config ? [config.format(value), name] : [value, name];
                } catch {
                  // Fallback if formatting fails
                  return [value, name];
                }
              }}
            />
            <Legend />
            
            {/* Anomaly markers */}
            {anomalies.map((anomaly, index) => {
              const dateIndex = chartData.findIndex((d) => d.date === anomaly.date);
              if (dateIndex === -1) return null;
              
              return (
                <ReferenceLine
                  key={`anomaly-${index}`}
                  x={anomaly.date}
                  stroke="#EF4444"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  label={{ value: "⚠", position: "top", fill: "#EF4444" }}
                />
              );
            })}

            {/* Current period lines */}
            {!showBreakdowns ? (
              <>
                {selectedMetrics.map((metric, index) => {
                  const config = metricConfig[metric];
                  const isSinglePoint = baseDisplayData.length === 1;
                  return (
                    <Line
                      key={metric}
                      type={isSinglePoint ? "linear" : "monotone"}
                      dataKey={metric}
                      stroke={config.color}
                      strokeWidth={2}
                      dot={isSinglePoint ? { r: 6, fill: config.color } : { r: 4 }}
                      activeDot={{ r: 8, strokeWidth: 2 }}
                      name={config.label}
                      connectNulls={true}
                      isAnimationActive={true}
                      animationDuration={1500}
                      animationEasing="ease-out"
                      animationBegin={index * 200}
                    />
                  );
                })}

                {/* Previous period lines (comparison mode) */}
                {comparisonMode &&
                  previousChartData.length > 0 &&
                  selectedMetrics.map((metric, index) => {
                    const config = metricConfig[metric];
                    return (
                      <Line
                        key={`${metric}-previous`}
                        type="monotone"
                        dataKey={metric}
                        stroke={config.color}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        name={`${config.label} (previous)`}
                        data={previousChartData}
                        connectNulls
                        isAnimationActive={true}
                        animationDuration={1200}
                        animationEasing="ease-out"
                        animationBegin={index * 150 + 300}
                      />
                    );
                  })}
              </>
            ) : (
              // Breakdown lines - show top 5 dimensions
              (() => {
                if (!breakdownData || !breakdownType) return null;
                
                // Get unique dimensions and limit to top 5
                const dimensions = Array.from(
                  new Set(breakdownData.map((d) => d.dimension))
                ).slice(0, 5);
                
                const breakdownColors = [
                  "#3B82F6",
                  "#10B981",
                  "#F59E0B",
                  "#8B5CF6",
                  "#EF4444",
                ];

                return dimensions.flatMap((dimension, dimIndex) =>
                  selectedMetrics.map((metric, metricIndex) => {
                    const config = metricConfig[metric];
                    const color = breakdownColors[dimIndex % breakdownColors.length];
                    return (
                      <Line
                        key={`${dimension}_${metric}`}
                        type="monotone"
                        dataKey={`${dimension}_${metric}`}
                        stroke={color}
                        strokeWidth={2}
                        dot={false}
                        name={`${dimension} ${config.label}`}
                        connectNulls
                        isAnimationActive={true}
                        animationDuration={1200}
                        animationEasing="ease-out"
                        animationBegin={(dimIndex * selectedMetrics.length + metricIndex) * 100}
                      />
                    );
                  })
                );
              })()
            )}

            {/* Zoom brush */}
            {displayData.length > 7 && (
              <Brush
                dataKey="date"
                height={30}
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.1}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

