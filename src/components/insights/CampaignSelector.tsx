"use client";

import { useState, useEffect, useRef } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Campaign } from "@/types";

interface CampaignSelectorProps {
  campaigns: Campaign[];
  selectedCampaignIds: string[];
  onSelectionChange: (campaignIds: string[]) => void;
  placeholder?: string;
}

export function CampaignSelector({
  campaigns,
  selectedCampaignIds,
  onSelectionChange,
  placeholder = "Select campaigns...",
}: CampaignSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter campaigns by search query
  const filteredCampaigns = campaigns.filter((campaign) =>
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group campaigns by status
  const activeCampaigns = filteredCampaigns.filter((c) => c.status === "ACTIVE");
  const pausedCampaigns = filteredCampaigns.filter((c) => c.status === "PAUSED");
  const archivedCampaigns = filteredCampaigns.filter(
    (c) => c.status === "ARCHIVED" || c.status === "DELETED"
  );

  const toggleCampaign = (campaignId: string) => {
    if (selectedCampaignIds.includes(campaignId)) {
      onSelectionChange(selectedCampaignIds.filter((id) => id !== campaignId));
    } else {
      onSelectionChange([...selectedCampaignIds, campaignId]);
    }
  };

  const selectAll = () => {
    onSelectionChange(filteredCampaigns.map((c) => c.id));
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isOpen]);

  const selectedCampaigns = campaigns.filter((c) => selectedCampaignIds.includes(c.id));
  const displayText =
    selectedCampaignIds.length === 0
      ? placeholder
      : selectedCampaignIds.length === 1
        ? selectedCampaigns[0]?.name || placeholder
        : `${selectedCampaignIds.length} campaigns selected`;

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between min-w-[250px]"
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </Button>

      {isOpen && (
        <Card className="absolute top-full left-0 mt-2 w-full min-w-[400px] max-w-[600px] z-50 bg-white dark:bg-[#1e1f20] border-gray-200 dark:border-gray-800 shadow-lg max-h-[500px] flex flex-col">
          {/* Search */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-[#18191a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>

          {/* Actions */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={selectAll}
              className="text-xs"
            >
              Select All ({filteredCampaigns.length})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="text-xs"
            >
              Clear All
            </Button>
          </div>

          {/* Campaign List */}
          <div className="overflow-y-auto flex-1">
            {filteredCampaigns.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                No campaigns found
              </div>
            ) : (
              <>
                {activeCampaigns.length > 0 && (
                  <div className="p-2">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 px-2">
                      Active ({activeCampaigns.length})
                    </div>
                    {activeCampaigns.map((campaign) => {
                      const isSelected = selectedCampaignIds.includes(campaign.id);
                      return (
                        <div
                          key={campaign.id}
                          onClick={() => toggleCampaign(campaign.id)}
                          className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                        >
                          <div
                            className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                              isSelected
                                ? "bg-blue-500 border-blue-500"
                                : "border-gray-300 dark:border-gray-600"
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {campaign.name}
                            </div>
                            {campaign.objective && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {campaign.objective}
                              </div>
                            )}
                          </div>
                          {campaign.spend && parseFloat(campaign.spend) > 0 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              ${parseFloat(campaign.spend).toFixed(0)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {pausedCampaigns.length > 0 && (
                  <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 px-2">
                      Paused ({pausedCampaigns.length})
                    </div>
                    {pausedCampaigns.map((campaign) => {
                      const isSelected = selectedCampaignIds.includes(campaign.id);
                      return (
                        <div
                          key={campaign.id}
                          onClick={() => toggleCampaign(campaign.id)}
                          className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                        >
                          <div
                            className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                              isSelected
                                ? "bg-blue-500 border-blue-500"
                                : "border-gray-300 dark:border-gray-600"
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {campaign.name}
                            </div>
                            {campaign.objective && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {campaign.objective}
                              </div>
                            )}
                          </div>
                          {campaign.spend && parseFloat(campaign.spend) > 0 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              ${parseFloat(campaign.spend).toFixed(0)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {archivedCampaigns.length > 0 && (
                  <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 px-2">
                      Archived ({archivedCampaigns.length})
                    </div>
                    {archivedCampaigns.map((campaign) => {
                      const isSelected = selectedCampaignIds.includes(campaign.id);
                      return (
                        <div
                          key={campaign.id}
                          onClick={() => toggleCampaign(campaign.id)}
                          className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                        >
                          <div
                            className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                              isSelected
                                ? "bg-blue-500 border-blue-500"
                                : "border-gray-300 dark:border-gray-600"
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {campaign.name}
                            </div>
                            {campaign.objective && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {campaign.objective}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Selected Count Footer */}
          {selectedCampaignIds.length > 0 && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedCampaignIds.length} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

