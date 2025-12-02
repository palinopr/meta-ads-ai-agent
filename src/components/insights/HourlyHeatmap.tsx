"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, DollarSign, Target, TrendingUp } from "lucide-react";

interface HourlyData {
  day_of_week?: string;
  hourly_stats_aggregated_by_advertiser_time_zone?: string;
  hour?: number;
  spend: number;
  impressions: number;
  clicks: number;
  results: number;
  roas: number;
  purchase_value?: number;
}

interface HourlyHeatmapProps {
  data: HourlyData[];
}

type MetricType = "spend" | "results" | "roas" | "revenue";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_ABBREVIATIONS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function HourlyHeatmap({ data }: HourlyHeatmapProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("results");

  // Process data into day x hour grid
  const heatmapData = useMemo(() => {
    const grid: Record<string, Record<number, HourlyData>> = {};
    
    // Initialize grid
    DAYS.forEach(day => {
      const dayGrid: Record<number, HourlyData> = {};
      HOURS.forEach(hour => {
        dayGrid[hour] = {
          spend: 0,
          impressions: 0,
          clicks: 0,
          results: 0,
          roas: 0,
          purchase_value: 0,
        };
      });
      grid[day] = dayGrid;
    });

    // Fill in data
    data.forEach(item => {
      let dayName = item.day_of_week;
      let hour = item.hour;

      // Handle hourly_stats format (hour is in the string like "00:00:00" - "23:00:00")
      if (item.hourly_stats_aggregated_by_advertiser_time_zone) {
        const hourStr = item.hourly_stats_aggregated_by_advertiser_time_zone;
        const hourMatch = hourStr.match(/^(\d+)/);
        if (hourMatch && hourMatch[1]) {
          hour = parseInt(hourMatch[1], 10);
        }
      }

      // Map day number to day name if needed
      if (typeof dayName === "string" && /^\d+$/.test(dayName)) {
        const dayNum = parseInt(dayName, 10);
        dayName = DAYS[dayNum] || dayName;
      }

      const dayGrid = dayName ? grid[dayName] : undefined;
      const hourNum = typeof hour === "number" ? hour : undefined;
      const existingCell = dayGrid && hourNum !== undefined ? dayGrid[hourNum] : undefined;
      
      if (dayGrid && existingCell !== undefined && hourNum !== undefined) {
        dayGrid[hourNum] = {
          spend: (existingCell.spend || 0) + item.spend,
          impressions: (existingCell.impressions || 0) + item.impressions,
          clicks: (existingCell.clicks || 0) + item.clicks,
          results: (existingCell.results || 0) + item.results,
          roas: item.roas, // Use latest ROAS
          purchase_value: (existingCell.purchase_value || 0) + (item.purchase_value || 0),
        };
      }
    });

    return grid;
  }, [data]);

  // Calculate min/max for color scaling
  const { minValue, maxValue } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;

    DAYS.forEach(day => {
      HOURS.forEach(hour => {
        const cell = heatmapData[day]?.[hour];
        if (cell) {
          const value = selectedMetric === "revenue" 
            ? (cell.purchase_value || 0) 
            : cell[selectedMetric];
          if (value > 0) {
            min = Math.min(min, value);
            max = Math.max(max, value);
          }
        }
      });
    });

    return { 
      minValue: min === Infinity ? 0 : min, 
      maxValue: max === -Infinity ? 0 : max 
    };
  }, [heatmapData, selectedMetric]);

  // Get cell color based on value
  const getCellColor = (value: number) => {
    if (value === 0 || maxValue === 0) {
      return "bg-gray-100 dark:bg-gray-800";
    }

    const normalized = (value - minValue) / (maxValue - minValue);
    
    // Green gradient for positive metrics
    if (normalized >= 0.8) return "bg-green-600 dark:bg-green-500";
    if (normalized >= 0.6) return "bg-green-500 dark:bg-green-600";
    if (normalized >= 0.4) return "bg-green-400 dark:bg-green-700";
    if (normalized >= 0.2) return "bg-green-300 dark:bg-green-800";
    return "bg-green-200 dark:bg-green-900";
  };

  // Format value for tooltip
  const formatValue = (value: number, metric: MetricType): string => {
    switch (metric) {
      case "spend":
      case "revenue":
        return `$${value.toFixed(2)}`;
      case "roas":
        return `${value.toFixed(2)}x`;
      case "results":
        return value.toFixed(0);
      default:
        return value.toFixed(2);
    }
  };

  // Get best performing cells
  const topPerformers = useMemo(() => {
    const cells: Array<{ day: string; hour: number; value: number }> = [];
    
    DAYS.forEach(day => {
      HOURS.forEach(hour => {
        const cell = heatmapData[day]?.[hour];
        if (cell) {
          const value = selectedMetric === "revenue" 
            ? (cell.purchase_value || 0) 
            : cell[selectedMetric];
          if (value > 0) {
            cells.push({ day, hour, value });
          }
        }
      });
    });

    return cells.sort((a, b) => b.value - a.value).slice(0, 5);
  }, [heatmapData, selectedMetric]);

  const metrics: Array<{ key: MetricType; label: string; icon: React.ReactNode }> = [
    { key: "results", label: "Conversions", icon: <Target className="h-4 w-4" /> },
    { key: "revenue", label: "Revenue", icon: <DollarSign className="h-4 w-4" /> },
    { key: "spend", label: "Spend", icon: <DollarSign className="h-4 w-4" /> },
    { key: "roas", label: "ROAS", icon: <TrendingUp className="h-4 w-4" /> },
  ];

  const formatHour = (hour: number): string => {
    if (hour === 0) return "12am";
    if (hour === 12) return "12pm";
    return hour > 12 ? `${hour - 12}pm` : `${hour}am`;
  };

  // Check if we have any data
  const hasData = data.length > 0 && maxValue > 0;

  return (
    <Card className="p-6 bg-white dark:bg-[#242526] border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Best Hours for Performance
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Heatmap showing when your ads perform best
            </p>
          </div>
        </div>

        {/* Metric Selector */}
        <div className="flex gap-2">
          {metrics.map(metric => (
            <Button
              key={metric.key}
              variant={selectedMetric === metric.key ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedMetric(metric.key)}
              className="text-xs"
            >
              {metric.icon}
              <span className="ml-1">{metric.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hourly breakdown data available</p>
            <p className="text-sm mt-1">Select a longer date range or different ad</p>
          </div>
        </div>
      ) : (
        <>
          {/* Heatmap Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Hour Labels */}
              <div className="flex mb-2">
                <div className="w-16" /> {/* Spacer for day labels */}
                {HOURS.map(hour => (
                  <div
                    key={hour}
                    className="flex-1 text-center text-xs text-gray-500 dark:text-gray-400"
                  >
                    {hour % 3 === 0 ? formatHour(hour) : ""}
                  </div>
                ))}
              </div>

              {/* Grid Rows */}
              {DAYS.map((day, dayIndex) => (
                <div key={day} className="flex items-center mb-1">
                  {/* Day Label */}
                  <div className="w-16 text-xs font-medium text-gray-600 dark:text-gray-400">
                    {DAY_ABBREVIATIONS[dayIndex]}
                  </div>

                  {/* Hour Cells */}
                  {HOURS.map(hour => {
                    const cell = heatmapData[day]?.[hour];
                    const value = cell 
                      ? (selectedMetric === "revenue" ? (cell.purchase_value || 0) : cell[selectedMetric])
                      : 0;
                    
                    return (
                      <div
                        key={hour}
                        className={`flex-1 h-8 mx-0.5 rounded cursor-pointer transition-all 
                                   hover:ring-2 hover:ring-blue-500 hover:z-10 relative
                                   ${getCellColor(value)}`}
                        title={`${day} ${formatHour(hour)}: ${formatValue(value, selectedMetric)}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Color Legend */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <span className="text-xs text-gray-500 dark:text-gray-400">Low</span>
            <div className="flex gap-0.5">
              <div className="w-4 h-4 rounded bg-green-200 dark:bg-green-900" />
              <div className="w-4 h-4 rounded bg-green-300 dark:bg-green-800" />
              <div className="w-4 h-4 rounded bg-green-400 dark:bg-green-700" />
              <div className="w-4 h-4 rounded bg-green-500 dark:bg-green-600" />
              <div className="w-4 h-4 rounded bg-green-600 dark:bg-green-500" />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">High</span>
          </div>

          {/* Top Performers Summary */}
          {topPerformers.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Top 5 Best Times
              </h3>
              <div className="grid grid-cols-5 gap-4">
                {topPerformers.map((item, index) => (
                  <div
                    key={`${item.day}-${item.hour}`}
                    className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                  >
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      #{index + 1}
                    </div>
                    <div className="font-medium text-gray-900 dark:text-white text-sm">
                      {DAY_ABBREVIATIONS[DAYS.indexOf(item.day)]} {formatHour(item.hour)}
                    </div>
                    <div className="text-green-600 dark:text-green-400 font-semibold">
                      {formatValue(item.value, selectedMetric)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

