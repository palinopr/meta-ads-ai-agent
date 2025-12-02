"use client";

import { useState, useEffect, useRef } from "react";
import { Calendar, ChevronDown, RefreshCw } from "lucide-react";

interface StickyDateHeaderProps {
  dateRange: string;
  onDateRangeChange: (range: string) => void;
  comparisonMode: boolean;
  onComparisonModeChange: (enabled: boolean) => void;
  isLoading?: boolean;
  onRefresh?: () => void;
  lastUpdated?: Date;
}

const DATE_PRESETS = [
  { label: "Today", value: "Today" },
  { label: "7D", value: "Last 7 Days" },
  { label: "14D", value: "Last 14 Days" },
  { label: "30D", value: "Last 30 Days" },
  { label: "90D", value: "Last 90 Days" },
  { label: "Max", value: "Maximum" },
];

export function StickyDateHeader({
  dateRange,
  onDateRangeChange,
  comparisonMode,
  onComparisonModeChange,
  isLoading = false,
  onRefresh,
  lastUpdated,
}: StickyDateHeaderProps) {
  const [isSticky, setIsSticky] = useState(false);
  const [showAllPresets, setShowAllPresets] = useState(false);
  const [showMobileDropdown, setShowMobileDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 100);
    };

    const handleResize = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowMobileDropdown(false);
      }
    };

    handleResize(); // Check initial size
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    document.addEventListener("click", handleClickOutside);
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  // Get comparison period description
  const getComparisonPeriod = () => {
    switch (dateRange) {
      case "Today":
        return "vs Yesterday";
      case "Last 7 Days":
        return "vs Previous 7 Days";
      case "Last 14 Days":
        return "vs Previous 14 Days";
      case "Last 30 Days":
        return "vs Previous 30 Days";
      case "Last 90 Days":
        return "vs Previous 90 Days";
      default:
        return "vs Previous Period";
    }
  };

  return (
    <div
      className={`transition-all duration-300 ${
        isSticky
          ? "fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#18191a]/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm px-6 py-3"
          : "bg-white dark:bg-[#1e1f20] rounded-xl border border-gray-200 dark:border-gray-800 px-5 py-4"
      }`}
    >
      <div className={`${isSticky ? "max-w-7xl mx-auto" : ""}`}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Date Range Section */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-medium hidden sm:inline">Date Range:</span>
            </div>

            {/* Mobile: Dropdown */}
            {isMobile ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMobileDropdown(!showMobileDropdown);
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
                >
                  {DATE_PRESETS.find(p => p.value === dateRange)?.label || dateRange}
                  <ChevronDown className={`h-4 w-4 transition-transform ${showMobileDropdown ? "rotate-180" : ""}`} />
                </button>
                
                {showMobileDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 animate-slide-up">
                    {DATE_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => {
                          onDateRangeChange(preset.value);
                          setShowMobileDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm first:rounded-t-lg last:rounded-b-lg transition-colors ${
                          dateRange === preset.value
                            ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                      >
                        {preset.value}
                        {dateRange === preset.value && (
                          <span className="float-right">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Desktop: Quick Preset Buttons */
              <div className="flex items-center gap-1">
                {DATE_PRESETS.slice(0, showAllPresets ? DATE_PRESETS.length : 4).map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => onDateRangeChange(preset.value)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                      dateRange === preset.value
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}

                {/* More Options Button */}
                {!showAllPresets && DATE_PRESETS.length > 4 && (
                  <button
                    onClick={() => setShowAllPresets(true)}
                    className="px-2 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right Section: Comparison Toggle, Refresh, Last Updated */}
          <div className="flex items-center gap-4">
            {/* Comparison Mode Toggle */}
            <div className="flex items-center gap-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={comparisonMode}
                  onChange={(e) => onComparisonModeChange(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
              <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:inline">
                Compare
              </span>
              {comparisonMode && (
                <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full hidden md:inline">
                  {getComparisonPeriod()}
                </span>
              )}
            </div>

            {/* Refresh Button */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  isLoading
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-400"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                }`}
                title="Refresh data"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            )}

            {/* Last Updated */}
            {lastUpdated && !isSticky && (
              <span className="text-xs text-gray-500 dark:text-gray-400 hidden lg:inline">
                Updated {formatRelativeTime(lastUpdated)}
              </span>
            )}
          </div>
        </div>

        {/* Comparison Period Info Banner */}
        {comparisonMode && !isSticky && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              📊 Comparing <span className="font-medium text-gray-900 dark:text-white">{dateRange}</span>{" "}
              <span className="text-gray-500 dark:text-gray-500">{getComparisonPeriod()}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return date.toLocaleDateString();
}

