"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";

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

interface MoneyFlowChartProps {
  data: DailyData[];
}

export function MoneyFlowChart({ data }: MoneyFlowChartProps) {
  // Transform data for chart
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((point) => ({
      date: new Date(point.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      spend: point.spend || 0,
      revenue: point.purchase_value || 0,
    }));
  }, [data]);

  // Calculate totals for header
  const totals = useMemo(() => {
    if (!data || data.length === 0) return { spend: 0, revenue: 0, profit: 0, roas: 0 };
    const spend = data.reduce((sum, d) => sum + (d.spend || 0), 0);
    const revenue = data.reduce((sum, d) => sum + (d.purchase_value || 0), 0);
    return {
      spend,
      revenue,
      profit: revenue - spend,
      roas: spend > 0 ? revenue / spend : 0,
    };
  }, [data]);

  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  if (!data || data.length === 0) {
    return (
      <Card className="bg-white dark:bg-[#242526] border-gray-200 dark:border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-500" />
            Money Flow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-gray-500">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-[#242526] border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-500" />
            Money Flow
          </CardTitle>
          
          {/* Summary Stats */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-gray-600 dark:text-gray-400">Spend:</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {formatCurrency(totals.spend)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-gray-600 dark:text-gray-400">Revenue:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(totals.revenue)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {totals.profit >= 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className="text-gray-600 dark:text-gray-400">Profit:</span>
              <span className={`font-semibold ${totals.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {totals.profit >= 0 ? "+" : ""}{formatCurrency(totals.profit)}
              </span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800">
              <span className="text-gray-600 dark:text-gray-400">ROAS:</span>
              <span className={`font-bold ${totals.roas >= 1 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                {totals.roas.toFixed(2)}x
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ top: 10, right: 60, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="gradientSpend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="gradientRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            
            <XAxis 
              dataKey="date" 
              tick={{ fill: "currentColor", fontSize: 12 }}
              className="text-gray-600 dark:text-gray-400"
            />
            
            {/* Left Y-Axis for Spend */}
            <YAxis 
              yAxisId="left"
              orientation="left"
              tick={{ fill: "#3B82F6", fontSize: 12 }}
              tickFormatter={(value) => formatCurrency(value)}
              label={{ 
                value: "Spend", 
                angle: -90, 
                position: "insideLeft",
                fill: "#3B82F6",
                fontSize: 12,
                dy: 20
              }}
            />
            
            {/* Right Y-Axis for Revenue */}
            <YAxis 
              yAxisId="right"
              orientation="right"
              tick={{ fill: "#10B981", fontSize: 12 }}
              tickFormatter={(value) => formatCurrency(value)}
              label={{ 
                value: "Revenue", 
                angle: 90, 
                position: "insideRight",
                fill: "#10B981",
                fontSize: 12,
                dy: -25
              }}
            />
            
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                border: "none",
                borderRadius: "12px",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
                padding: "12px 16px",
              }}
              formatter={(value: number, name: string) => {
                const formattedValue = `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                return [formattedValue, name === "spend" ? "Spend" : "Revenue"];
              }}
            />
            
            <Legend 
              wrapperStyle={{ paddingTop: "10px" }}
              formatter={(value) => (
                <span className="text-gray-700 dark:text-gray-300">
                  {value === "spend" ? "Spend" : "Revenue"}
                </span>
              )}
            />
            
            {/* Spend Area - Left Axis */}
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="spend"
              stroke="#3B82F6"
              strokeWidth={2.5}
              fill="url(#gradientSpend)"
              name="spend"
              isAnimationActive={true}
              animationDuration={1500}
              animationEasing="ease-out"
            />
            
            {/* Revenue Area - Right Axis */}
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="revenue"
              stroke="#10B981"
              strokeWidth={2.5}
              fill="url(#gradientRevenue)"
              name="revenue"
              isAnimationActive={true}
              animationDuration={1500}
              animationEasing="ease-out"
              animationBegin={200}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

