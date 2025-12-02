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
  Legend,
} from "recharts";
import { Users, Smartphone, LayoutGrid } from "lucide-react";

interface BreakdownData {
  dimension: string;
  spend: number;
  impressions: number;
  clicks: number;
  results: number;
  roas: number;
  ctr: number;
  purchase_value?: number;
}

interface DemographicsPanelProps {
  ageData?: BreakdownData[];
  genderData?: BreakdownData[];
  deviceData?: BreakdownData[];
  placementData?: BreakdownData[];
}

type MetricType = "spend" | "results" | "roas" | "ctr";

const AGE_COLORS = ["#3B82F6", "#60A5FA", "#93C5FD", "#BFDBFE", "#DBEAFE", "#EFF6FF"];
const GENDER_COLORS = { male: "#3B82F6", female: "#EC4899", unknown: "#9CA3AF" };
const DEVICE_COLORS = ["#10B981", "#34D399", "#6EE7B7", "#A7F3D0"];
const PLACEMENT_COLORS = ["#F59E0B", "#FBBF24", "#FCD34D", "#FDE68A", "#FEF3C7"];

export function DemographicsPanel({
  ageData = [],
  genderData = [],
  deviceData = [],
  placementData = [],
}: DemographicsPanelProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("results");

  const formatValue = (value: number, metric: MetricType): string => {
    switch (metric) {
      case "spend":
        return `$${value.toFixed(2)}`;
      case "roas":
        return `${value.toFixed(2)}x`;
      case "ctr":
        return `${value.toFixed(2)}%`;
      case "results":
        return value.toFixed(0);
      default:
        return value.toFixed(2);
    }
  };

  const formatYAxis = (value: number, metric: MetricType): string => {
    if (metric === "spend") {
      if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
      return `$${value.toFixed(0)}`;
    }
    if (metric === "roas") return `${value.toFixed(1)}x`;
    if (metric === "ctr") return `${value.toFixed(1)}%`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toFixed(0);
  };

  const processData = (data: BreakdownData[]) => {
    return data
      .map(item => ({
        ...item,
        value: item[selectedMetric] || 0,
      }))
      .sort((a, b) => b.value - a.value);
  };

  // Process age data - sort by age group
  const processedAgeData = useMemo(() => {
    const ageOrder = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
    return [...ageData]
      .map(item => ({
        ...item,
        value: item[selectedMetric] || 0,
      }))
      .sort((a, b) => {
        const indexA = ageOrder.findIndex(age => a.dimension.includes(age));
        const indexB = ageOrder.findIndex(age => b.dimension.includes(age));
        return indexA - indexB;
      });
  }, [ageData, selectedMetric]);

  // Process gender data for pie chart
  const processedGenderData = useMemo(() => {
    return genderData.map(item => ({
      name: item.dimension,
      value: item[selectedMetric] || 0,
      fill: item.dimension.toLowerCase() === "male" 
        ? GENDER_COLORS.male 
        : item.dimension.toLowerCase() === "female" 
        ? GENDER_COLORS.female 
        : GENDER_COLORS.unknown,
    }));
  }, [genderData, selectedMetric]);

  const processedDeviceData = useMemo(() => processData(deviceData), [deviceData, selectedMetric]);
  const processedPlacementData = useMemo(() => processData(placementData), [placementData, selectedMetric]);

  const metrics: Array<{ key: MetricType; label: string }> = [
    { key: "results", label: "Conversions" },
    { key: "spend", label: "Spend" },
    { key: "roas", label: "ROAS" },
    { key: "ctr", label: "CTR" },
  ];

  const hasData = ageData.length > 0 || genderData.length > 0 || deviceData.length > 0 || placementData.length > 0;

  if (!hasData) {
    return (
      <Card className="p-6 bg-white dark:bg-[#242526] border-gray-200 dark:border-gray-800">
        <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No demographic breakdown data available</p>
            <p className="text-sm mt-1">This data requires ad-level insights</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Metric Selector */}
      <Card className="p-4 bg-white dark:bg-[#242526] border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Audience Demographics
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Breakdown by age, gender, device, and placement
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {metrics.map(metric => (
              <Button
                key={metric.key}
                variant={selectedMetric === metric.key ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedMetric(metric.key)}
                className="text-xs"
              >
                {metric.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Age Breakdown */}
        {ageData.length > 0 && (
          <Card className="p-6 bg-white dark:bg-[#242526] border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-blue-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Age Groups</h3>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={processedAgeData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis 
                  dataKey="dimension" 
                  tick={{ fill: "currentColor", fontSize: 12 }}
                  className="text-gray-600 dark:text-gray-400"
                />
                <YAxis 
                  tickFormatter={(v) => formatYAxis(v, selectedMetric)}
                  tick={{ fill: "currentColor", fontSize: 12 }}
                  className="text-gray-600 dark:text-gray-400"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [formatValue(value, selectedMetric), metrics.find(m => m.key === selectedMetric)?.label]}
                />
                <Bar dataKey={selectedMetric} fill="#3B82F6" radius={[4, 4, 0, 0]}>
                  {processedAgeData.map((_, index) => (
                    <Cell key={index} fill={AGE_COLORS[index % AGE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Gender Breakdown */}
        {genderData.length > 0 && (
          <Card className="p-6 bg-white dark:bg-[#242526] border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-pink-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Gender</h3>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={processedGenderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {processedGenderData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [formatValue(value, selectedMetric), metrics.find(m => m.key === selectedMetric)?.label]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Device Breakdown */}
        {deviceData.length > 0 && (
          <Card className="p-6 bg-white dark:bg-[#242526] border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <Smartphone className="h-5 w-5 text-green-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Device Platform</h3>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={processedDeviceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis 
                  type="number"
                  tickFormatter={(v) => formatYAxis(v, selectedMetric)}
                  tick={{ fill: "currentColor", fontSize: 12 }}
                  className="text-gray-600 dark:text-gray-400"
                />
                <YAxis 
                  type="category" 
                  dataKey="dimension" 
                  width={100}
                  tick={{ fill: "currentColor", fontSize: 12 }}
                  className="text-gray-600 dark:text-gray-400"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [formatValue(value, selectedMetric), metrics.find(m => m.key === selectedMetric)?.label]}
                />
                <Bar dataKey={selectedMetric} fill="#10B981" radius={[0, 4, 4, 0]}>
                  {processedDeviceData.map((_, index) => (
                    <Cell key={index} fill={DEVICE_COLORS[index % DEVICE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Placement Breakdown */}
        {placementData.length > 0 && (
          <Card className="p-6 bg-white dark:bg-[#242526] border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <LayoutGrid className="h-5 w-5 text-amber-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Placement</h3>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={processedPlacementData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis 
                  type="number"
                  tickFormatter={(v) => formatYAxis(v, selectedMetric)}
                  tick={{ fill: "currentColor", fontSize: 12 }}
                  className="text-gray-600 dark:text-gray-400"
                />
                <YAxis 
                  type="category" 
                  dataKey="dimension" 
                  width={120}
                  tick={{ fill: "currentColor", fontSize: 11 }}
                  className="text-gray-600 dark:text-gray-400"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [formatValue(value, selectedMetric), metrics.find(m => m.key === selectedMetric)?.label]}
                />
                <Bar dataKey={selectedMetric} fill="#F59E0B" radius={[0, 4, 4, 0]}>
                  {processedPlacementData.map((_, index) => (
                    <Cell key={index} fill={PLACEMENT_COLORS[index % PLACEMENT_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>
    </div>
  );
}

