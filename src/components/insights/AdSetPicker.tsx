"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { 
  Search, 
  Layers, 
  ArrowRight, 
  TrendingUp, 
  TrendingDown,
  Minus,
  DollarSign,
  Target,
} from "lucide-react";

interface AdSet {
  id: string;
  name: string;
  status: string;
  campaign_id?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  results?: string;
  purchase_value?: string;
  ctr?: string;
  cpm?: string;
  cpc?: string;
}

interface AdSetPickerProps {
  adSets: AdSet[];
  loading?: boolean;
  onSelectAdSet: (adSetId: string, adSetName: string) => void;
}

export function AdSetPicker({ adSets, loading, onSelectAdSet }: AdSetPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Group ad sets by status
  const groupedAdSets = useMemo(() => {
    const filtered = adSets.filter((adSet) =>
      adSet.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const active = filtered.filter((a) => a.status === "ACTIVE");
    const paused = filtered.filter((a) => a.status === "PAUSED");
    const other = filtered.filter(
      (a) => a.status !== "ACTIVE" && a.status !== "PAUSED"
    );

    return { active, paused, other };
  }, [adSets, searchQuery]);

  const formatCurrency = (value: string | undefined) => {
    if (!value) return "$0";
    const num = parseFloat(value);
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num.toFixed(0)}`;
  };

  const formatNumber = (value: string | undefined) => {
    if (!value) return "0";
    const num = parseFloat(value);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  const getROAS = (adSet: AdSet) => {
    const spend = parseFloat(adSet.spend || "0");
    const revenue = parseFloat(adSet.purchase_value || "0");
    if (spend === 0) return 0;
    return revenue / spend;
  };

  const renderAdSetCard = (adSet: AdSet) => {
    const roas = getROAS(adSet);

    return (
      <button
        key={adSet.id}
        onClick={() => onSelectAdSet(adSet.id, adSet.name)}
        className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 
                   bg-white dark:bg-[#242526] hover:bg-gray-50 dark:hover:bg-[#3a3b3c]
                   hover:border-blue-300 dark:hover:border-blue-600
                   transition-all duration-200 text-left group"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  adSet.status === "ACTIVE"
                    ? "bg-green-500"
                    : adSet.status === "PAUSED"
                    ? "bg-yellow-500"
                    : "bg-gray-400"
                }`}
              />
              <h4 className="font-medium text-gray-900 dark:text-white truncate">
                {adSet.name}
              </h4>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              ID: {adSet.id}
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
        </div>

        {/* Metrics Row */}
        <div className="mt-3 grid grid-cols-4 gap-3 text-sm">
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3 text-blue-500" />
            <span className="text-gray-600 dark:text-gray-400">Spend:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {formatCurrency(adSet.spend)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Target className="h-3 w-3 text-purple-500" />
            <span className="text-gray-600 dark:text-gray-400">Results:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {formatNumber(adSet.results)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-600 dark:text-gray-400">ROAS:</span>
            <span
              className={`font-medium ${
                roas >= 1
                  ? "text-green-600 dark:text-green-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              {roas.toFixed(2)}x
            </span>
            {roas >= 1 ? (
              <TrendingUp className="h-3 w-3 text-green-500" />
            ) : roas > 0 ? (
              <TrendingDown className="h-3 w-3 text-amber-500" />
            ) : (
              <Minus className="h-3 w-3 text-gray-400" />
            )}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-600 dark:text-gray-400">Impr:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {formatNumber(adSet.impressions)}
            </span>
          </div>
        </div>
      </button>
    );
  };

  const renderGroup = (
    title: string,
    items: AdSet[],
    color: string,
    _icon: React.ReactNode
  ) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className={`w-2 h-2 rounded-full ${color}`} />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {title}
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            ({items.length})
          </span>
        </div>
        <div className="space-y-3">{items.map(renderAdSetCard)}</div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="p-6 bg-white dark:bg-[#242526] border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-white dark:bg-[#242526] border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
          <Layers className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Select an Ad Set
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Choose an ad set to view detailed insights
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search ad sets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 
                     bg-gray-50 dark:bg-[#3a3b3c] text-gray-900 dark:text-white
                     placeholder-gray-500 dark:placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Ad Set Groups */}
      <div className="max-h-[500px] overflow-y-auto">
        {groupedAdSets.active.length === 0 &&
        groupedAdSets.paused.length === 0 &&
        groupedAdSets.other.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {searchQuery
              ? "No ad sets match your search"
              : "No ad sets found for this campaign"}
          </div>
        ) : (
          <>
            {renderGroup(
              "Active Ad Sets",
              groupedAdSets.active,
              "bg-green-500",
              <TrendingUp className="h-4 w-4" />
            )}
            {renderGroup(
              "Paused Ad Sets",
              groupedAdSets.paused,
              "bg-yellow-500",
              <Minus className="h-4 w-4" />
            )}
            {renderGroup(
              "Other Ad Sets",
              groupedAdSets.other,
              "bg-gray-400",
              <Minus className="h-4 w-4" />
            )}
          </>
        )}
      </div>
    </Card>
  );
}

