"use client";

import { useState, useEffect } from "react";
import { Filter, X, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export type CampaignStatus = "ALL" | "ACTIVE" | "PAUSED" | "ARCHIVED";

export interface FilterOptions {
  status: CampaignStatus;
  objective?: string;
  budgetMin?: number;
  budgetMax?: number;
  customDateStart?: string;
  customDateEnd?: string;
  breakdowns?: string[];
}

interface FilterPanelProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  objectives?: string[];
  breakdownOptions?: Array<{ value: string; label: string }>;
}

export function FilterPanel({
  filters,
  onFiltersChange,
  objectives = [],
  breakdownOptions = [],
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    handleResize(); // Check initial size
    window.addEventListener("resize", handleResize, { passive: true });
    
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Prevent body scroll when drawer is open on mobile
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, isMobile]);

  const updateFilter = <K extends keyof FilterOptions>(
    key: K,
    value: FilterOptions[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      status: "ALL",
      objective: undefined,
      budgetMin: undefined,
      budgetMax: undefined,
      customDateStart: undefined,
      customDateEnd: undefined,
      breakdowns: undefined,
    });
  };

  const hasActiveFilters =
    filters.status !== "ALL" ||
    filters.objective !== undefined ||
    filters.budgetMin !== undefined ||
    filters.budgetMax !== undefined ||
    filters.customDateStart !== undefined ||
    filters.customDateEnd !== undefined ||
    (filters.breakdowns && filters.breakdowns.length > 0);

  const activeFilterCount =
    (filters.status !== "ALL" ? 1 : 0) +
    (filters.objective ? 1 : 0) +
    (filters.budgetMin || filters.budgetMax ? 1 : 0) +
    (filters.customDateStart || filters.customDateEnd ? 1 : 0) +
    (filters.breakdowns?.length || 0);

  const FilterContent = () => (
    <div className="space-y-4">
      {/* Status Filter */}
      <div>
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">
          Status
        </label>
        <div className="flex flex-wrap gap-2">
          {(["ALL", "ACTIVE", "PAUSED", "ARCHIVED"] as CampaignStatus[]).map((status) => (
            <Button
              key={status}
              variant={filters.status === status ? "default" : "outline"}
              size="sm"
              onClick={() => updateFilter("status", status)}
              className="text-xs"
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      {/* Objective Filter */}
      {objectives.length > 0 && (
        <div>
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            Objective
          </label>
          <select
            value={filters.objective || ""}
            onChange={(e) =>
              updateFilter("objective", e.target.value || undefined)
            }
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-[#18191a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Objectives</option>
            {objectives.map((obj) => (
              <option key={obj} value={obj}>
                {obj}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Budget Range */}
      <div>
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">
          Budget Range ($)
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.budgetMin || ""}
            onChange={(e) =>
              updateFilter("budgetMin", e.target.value ? parseFloat(e.target.value) : undefined)
            }
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-[#18191a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.budgetMax || ""}
            onChange={(e) =>
              updateFilter("budgetMax", e.target.value ? parseFloat(e.target.value) : undefined)
            }
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-[#18191a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Custom Date Range */}
      <div>
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block flex items-center gap-2">
          <Calendar className="h-3 w-3" />
          Custom Date Range
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="date"
            value={filters.customDateStart || ""}
            onChange={(e) => updateFilter("customDateStart", e.target.value || undefined)}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-[#18191a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={filters.customDateEnd || ""}
            onChange={(e) => updateFilter("customDateEnd", e.target.value || undefined)}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-[#18191a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Breakdowns */}
      {breakdownOptions.length > 0 && (
        <div>
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            Breakdowns
          </label>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {breakdownOptions.map((option) => {
              const isSelected = filters.breakdowns?.includes(option.value);
              return (
                <label
                  key={option.value}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isSelected || false}
                    onChange={(e) => {
                      const current = filters.breakdowns || [];
                      if (e.target.checked) {
                        updateFilter("breakdowns", [...current, option.value]);
                      } else {
                        updateFilter(
                          "breakdowns",
                          current.filter((b) => b !== option.value)
                        );
                      }
                    }}
                    className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {option.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={clearFilters}
          className="w-full"
        >
          <X className="h-4 w-4 mr-2" />
          Clear All Filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Filter className="h-4 w-4 mr-2" />
        Filters
        {activeFilterCount > 0 && (
          <span className="ml-2 px-1.5 py-0.5 text-xs font-semibold bg-blue-500 text-white rounded-full">
            {activeFilterCount}
          </span>
        )}
      </Button>

      {/* Mobile: Bottom Sheet Drawer */}
      {isMobile && isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 animate-in fade-in"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Bottom Sheet */}
          <div className="fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-[#1e1f20] rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col animate-slide-up">
            {/* Drag Handle */}
            <div className="flex justify-center py-3">
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>
            
            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <FilterContent />
            </div>
            
            {/* Footer Actions */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex gap-3">
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="flex-1"
                  >
                    Clear
                  </Button>
                )}
                <Button
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Desktop: Dropdown Card */}
      {!isMobile && isOpen && (
        <Card className="absolute top-full right-0 mt-2 w-80 z-50 bg-white dark:bg-[#1e1f20] border-gray-200 dark:border-gray-800 shadow-lg p-4 animate-scale-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Filters</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <FilterContent />
        </Card>
      )}
    </div>
  );
}
