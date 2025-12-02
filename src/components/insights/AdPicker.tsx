"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { 
  Search, 
  Image as ImageIcon, 
  ArrowRight, 
  TrendingUp, 
  TrendingDown,
  Minus,
  DollarSign,
  Target,
  MousePointerClick,
} from "lucide-react";

interface Ad {
  id: string;
  name: string;
  status: string;
  adset_id?: string;
  creative?: {
    id?: string;
    thumbnail_url?: string;
    image_url?: string;
  };
  spend?: string;
  impressions?: string;
  clicks?: string;
  results?: string;
  purchase_value?: string;
  ctr?: string;
  cpm?: string;
  cpc?: string;
}

interface AdPickerProps {
  ads: Ad[];
  loading?: boolean;
  onSelectAd: (adId: string, adName: string) => void;
}

export function AdPicker({ ads, loading, onSelectAd }: AdPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Group ads by status
  const groupedAds = useMemo(() => {
    const filtered = ads.filter((ad) =>
      ad.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const active = filtered.filter((a) => a.status === "ACTIVE");
    const paused = filtered.filter((a) => a.status === "PAUSED");
    const other = filtered.filter(
      (a) => a.status !== "ACTIVE" && a.status !== "PAUSED"
    );

    return { active, paused, other };
  }, [ads, searchQuery]);

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

  const getROAS = (ad: Ad) => {
    const spend = parseFloat(ad.spend || "0");
    const revenue = parseFloat(ad.purchase_value || "0");
    if (spend === 0) return 0;
    return revenue / spend;
  };

  const renderAdCard = (ad: Ad) => {
    const roas = getROAS(ad);
    const ctr = parseFloat(ad.ctr || "0");

    return (
      <button
        key={ad.id}
        onClick={() => onSelectAd(ad.id, ad.name)}
        className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 
                   bg-white dark:bg-[#242526] hover:bg-gray-50 dark:hover:bg-[#3a3b3c]
                   hover:border-blue-300 dark:hover:border-blue-600
                   transition-all duration-200 text-left group"
      >
        <div className="flex items-start gap-4">
          {/* Ad Thumbnail */}
          <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-800 flex-shrink-0 overflow-hidden">
            {ad.creative?.thumbnail_url || ad.creative?.image_url ? (
              <img
                src={ad.creative.thumbnail_url || ad.creative.image_url}
                alt={ad.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-gray-400" />
              </div>
            )}
          </div>

          {/* Ad Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  ad.status === "ACTIVE"
                    ? "bg-green-500"
                    : ad.status === "PAUSED"
                    ? "bg-yellow-500"
                    : "bg-gray-400"
                }`}
              />
              <h4 className="font-medium text-gray-900 dark:text-white truncate">
                {ad.name}
              </h4>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              ID: {ad.id}
            </p>

            {/* Metrics Row */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-blue-500" />
                <span className="text-gray-500">Spend:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(ad.spend)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Target className="h-3 w-3 text-purple-500" />
                <span className="text-gray-500">Results:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatNumber(ad.results)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500">ROAS:</span>
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
                <MousePointerClick className="h-3 w-3 text-cyan-500" />
                <span className="text-gray-500">CTR:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {ctr.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
        </div>
      </button>
    );
  };

  const renderGroup = (
    title: string,
    items: Ad[],
    color: string
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
        <div className="space-y-3">{items.map(renderAdCard)}</div>
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
        <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
          <ImageIcon className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Select an Ad
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Choose an ad to view detailed performance breakdowns
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search ads..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 
                     bg-gray-50 dark:bg-[#3a3b3c] text-gray-900 dark:text-white
                     placeholder-gray-500 dark:placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Ad Groups */}
      <div className="max-h-[500px] overflow-y-auto">
        {groupedAds.active.length === 0 &&
        groupedAds.paused.length === 0 &&
        groupedAds.other.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {searchQuery
              ? "No ads match your search"
              : "No ads found for this ad set"}
          </div>
        ) : (
          <>
            {renderGroup("Active Ads", groupedAds.active, "bg-green-500")}
            {renderGroup("Paused Ads", groupedAds.paused, "bg-yellow-500")}
            {renderGroup("Other Ads", groupedAds.other, "bg-gray-400")}
          </>
        )}
      </div>
    </Card>
  );
}

