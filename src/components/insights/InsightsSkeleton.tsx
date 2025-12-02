"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

// Shimmer animation overlay for enhanced visual effect
function ShimmerOverlay() {
  return (
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
  );
}

// KPI Card Skeleton
export function KPICardSkeleton() {
  return (
    <Card className="p-6 bg-white dark:bg-[#1e1f20] border-gray-200 dark:border-gray-800 relative overflow-hidden">
      <ShimmerOverlay />
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-9 w-28 mb-3" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
        {/* Mini sparkline skeleton */}
        <Skeleton className="h-8 w-16 rounded" />
      </div>
    </Card>
  );
}

// KPI Cards Grid Skeleton
export function KPIGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <KPICardSkeleton key={i} />
      ))}
    </div>
  );
}

// Trend Chart Skeleton
export function TrendChartSkeleton() {
  return (
    <Card className="p-6 bg-white dark:bg-[#1e1f20] border-gray-200 dark:border-gray-800 relative overflow-hidden">
      <ShimmerOverlay />
      <div className="mb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-40" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-16" />
            ))}
          </div>
        </div>
        
        {/* Metric toggles */}
        <div className="flex gap-2 mb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-md" />
          ))}
        </div>
      </div>
      
      {/* Chart area */}
      <div className="h-[450px] flex items-end gap-1 px-4">
        {/* Simulate bar chart */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end">
            <Skeleton 
              className="w-full rounded-t" 
              style={{ height: `${Math.random() * 60 + 20}%` }} 
            />
          </div>
        ))}
      </div>
      
      {/* X-axis labels */}
      <div className="flex justify-between mt-4 px-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-12" />
        ))}
      </div>
    </Card>
  );
}

// Campaign Matrix Skeleton
export function CampaignMatrixSkeleton() {
  return (
    <Card className="p-6 bg-white dark:bg-[#1e1f20] border-gray-200 dark:border-gray-800 relative overflow-hidden">
      <ShimmerOverlay />
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-6 w-56" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
      
      {/* Table header */}
      <div className="flex gap-4 pb-3 border-b border-gray-200 dark:border-gray-700 mb-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-16 ml-auto" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
      </div>
      
      {/* Table rows */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div 
          key={i} 
          className="flex gap-4 py-3 border-b border-gray-100 dark:border-gray-800"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-16 ml-auto" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </Card>
  );
}

// Audience Insights Skeleton
export function AudienceInsightsSkeleton() {
  return (
    <Card className="p-6 bg-white dark:bg-[#1e1f20] border-gray-200 dark:border-gray-800 relative overflow-hidden">
      <ShimmerOverlay />
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-6 w-48" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-16" />
          ))}
        </div>
      </div>
      
      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart skeleton */}
        <div>
          <Skeleton className="h-5 w-32 mb-4" />
          <div className="h-[300px] flex items-end gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton 
                key={i} 
                className="flex-1 rounded-t" 
                style={{ height: `${Math.random() * 60 + 30}%` }} 
              />
            ))}
          </div>
        </div>
        
        {/* Pie chart skeleton */}
        <div>
          <Skeleton className="h-5 w-40 mb-4" />
          <div className="h-[300px] flex items-center justify-center">
            <Skeleton className="h-40 w-40 rounded-full" />
          </div>
        </div>
      </div>
    </Card>
  );
}

// AI Insights Skeleton
export function AIInsightsSkeleton() {
  return (
    <Card className="p-6 bg-white dark:bg-[#1e1f20] border-gray-200 dark:border-gray-800 relative overflow-hidden">
      <ShimmerOverlay />
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-6 w-56" />
      </div>
      
      {/* Insight cards */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div 
          key={i} 
          className="p-4 rounded-lg border-l-4 border-l-gray-300 bg-gray-50 dark:bg-gray-800/50 mb-4"
        >
          <div className="flex items-start gap-3">
            <Skeleton className="h-5 w-5 rounded-full mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>
      ))}
    </Card>
  );
}

// Filter Bar Skeleton
export function FilterBarSkeleton() {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <Skeleton className="h-10 w-[250px]" />
      <Skeleton className="h-10 w-24" />
    </div>
  );
}

// Breadcrumb Skeleton
export function BreadcrumbSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="h-4 w-4" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-4" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
}

// Full Page Skeleton - Composes all skeleton components
export function InsightsPageSkeleton() {
  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-[#18191a] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6">
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        
        {/* Filters */}
        <FilterBarSkeleton />
        
        {/* KPI Cards */}
        <KPIGridSkeleton />
        
        {/* Info Banner Skeleton */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-5 w-5 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        </div>
        
        {/* Campaign Matrix */}
        <CampaignMatrixSkeleton />
        
        {/* AI Insights */}
        <AIInsightsSkeleton />
      </div>
    </div>
  );
}

export default InsightsPageSkeleton;

