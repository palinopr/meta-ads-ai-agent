"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Search,
  Filter,
  Columns,
  Download,
  MoreHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  ChevronRight,
  ChevronDown,
  Home,
  Play,
  Pause,
  Loader2,
  Plus,
  Copy,
  Pencil,
  Trash2,
  FlaskConical,
  BarChart3,
  Calendar,
  RefreshCw,
  Check,
  Gauge,
  FileText,
  LayoutGrid,
  Eye,
  EyeOff,
  Settings,
  LineChart,
  Target,
  Building2,
  ChevronsUpDown
} from "lucide-react";
import { useRouter } from "next/navigation";
import { AdAccount } from "@/types";
import { updateActiveAdAccount } from "@/app/(dashboard)/onboarding/actions";
import { toast } from "sonner";

// Types for the table
export interface CampaignRow {
  id: string;
  name: string;
  status: string;
  objective?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  budget_remaining?: string;
  buying_type?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  reach?: string;
  frequency?: string;
  conversions?: string;
  cost_per_conversion?: string;
  roas?: string;
  results?: string; // Actual purchase count (1, 2, 3, etc.)
  purchase_value?: string; // Total purchase value in dollars
  created_time?: string;
  start_time?: string;
  stop_time?: string;
}

export interface AdSetRow {
  id: string;
  name: string;
  campaign_id: string;
  status: string;
  daily_budget?: string;
  lifetime_budget?: string;
  budget_remaining?: string;
  optimization_goal?: string;
  billing_event?: string;
  bid_amount?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  reach?: string;
  frequency?: string;
  conversions?: string;
  cost_per_conversion?: string;
  roas?: string;
  results?: string;
  purchase_value?: string;
}

export interface AdRow {
  id: string;
  name: string;
  adset_id: string;
  status: string;
  creative?: {
    id: string;
    name?: string;
    body?: string;
    title?: string;
    thumbnail_url?: string;
  };
  spend?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  reach?: string;
  conversions?: string;
  cost_per_conversion?: string;
  roas?: string;
  results?: string;
  purchase_value?: string;
}

type ViewLevel = "campaigns" | "adsets" | "ads";

interface BreadcrumbItem {
  level: ViewLevel;
  id?: string;
  name: string;
}

type SortConfig = {
  key: string;
  direction: "asc" | "desc";
} | null;

interface MetaAdsTableProps {
  campaigns: CampaignRow[];
  accountId: string;
  accessToken: string;
  accountName?: string;
  adAccounts?: AdAccount[];
  currentAccountId?: string;
}

// Column visibility configuration
const defaultColumns = {
  offOn: true,
  name: true,
  delivery: true,
  budget: true,
  results: true,
  costPerResult: true,
  amountSpent: true,
  roas: false,
  reach: true,
  impressions: true,
  cpm: true,
  cpc: true,
  ctr: true,
  frequency: false,
  ends: false,
};

type ColumnKey = keyof typeof defaultColumns;

export function MetaAdsTable({
  campaigns,
  accessToken,
  accountId,
  accountName = "Ad Account",
  adAccounts = [],
  currentAccountId,
}: MetaAdsTableProps) {
  const router = useRouter();
  
  // View state
  const [viewLevel, setViewLevel] = useState<ViewLevel>("campaigns");
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignRow | null>(null);
  const [selectedAdSet, setSelectedAdSet] = useState<AdSetRow | null>(null);

  // Data state - campaigns from props but can be updated
  const [currentCampaigns, setCurrentCampaigns] = useState<CampaignRow[]>(campaigns);
  const [adSets, setAdSets] = useState<AdSetRow[]>([]);
  const [ads, setAds] = useState<AdRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Account switcher state
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState<string | null>(null);

  // Auto-update when campaigns prop changes (e.g., when ad account is switched)
  useEffect(() => {
    setCurrentCampaigns(campaigns);
    // Reset to campaigns view when account changes
    setViewLevel("campaigns");
    setSelectedCampaign(null);
    setSelectedAdSet(null);
    setAdSets([]);
    setAds([]);
    setSelectedIds(new Set());
    setLastUpdated(new Date());
  }, [campaigns]);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter/sort state
  const [searchQuery, setSearchQuery] = useState("");
  // Default: sort by status (Active first) then by spend descending
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "spend", direction: "desc" });
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "PAUSED">("ALL");
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null);

  // UI state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isColumnsOpen, setIsColumnsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  // Date range state - always start with "Today" to match SSR, then sync with localStorage
  const [dateRange, setDateRange] = useState("Today");
  const [isDateRangeInitialized, setIsDateRangeInitialized] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(defaultColumns);
  // Use null initially to avoid SSR/CSR hydration mismatch (Date() differs on server vs client)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Handle click outside date picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isDatePickerOpen &&
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target as Node)
      ) {
        setIsDatePickerOpen(false);
      }
    };

    if (isDatePickerOpen) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isDatePickerOpen]);
  
  // On mount, initialize client-only values
  useEffect(() => {
    setLastUpdated(new Date());
    
    // Load saved date range from localStorage
    const savedDateRange = localStorage.getItem("meta-ads-date-range");
    if (savedDateRange && savedDateRange !== "Today") {
      setDateRange(savedDateRange);
    }
    setIsDateRangeInitialized(true);
  }, []);

  // Persist date range to localStorage when it changes (after initialization)
  useEffect(() => {
    if (typeof window !== "undefined" && isDateRangeInitialized) {
      localStorage.setItem("meta-ads-date-range", dateRange);
    }
  }, [dateRange, isDateRangeInitialized]);

  // Fetch campaigns with a specific date range
  const fetchCampaigns = useCallback(
    async (selectedDateRange: string) => {
      console.log(`[fetchCampaigns] Starting fetch for dateRange: ${selectedDateRange}`);
      console.log(`[fetchCampaigns] accessToken: ${accessToken ? 'present' : 'missing'}, accountId: ${accountId}`);
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/meta/campaigns?dateRange=${encodeURIComponent(selectedDateRange)}`,
          {
            headers: {
              "x-access-token": accessToken,
              "x-account-id": accountId,
            },
          }
        );
        console.log(`[fetchCampaigns] Response status: ${response.status}`);
        if (response.ok) {
          const data = await response.json();
          console.log(`[fetchCampaigns] Got ${data.campaigns?.length || 0} campaigns`);
          // Log first campaign's insights to debug
          if (data.campaigns?.[0]) {
            const c = data.campaigns[0];
            console.log(`[fetchCampaigns] Sample campaign: ${c.name}, spend: ${c.spend}, impressions: ${c.impressions}, results: ${c.results}`);
          }
          setCurrentCampaigns(data.campaigns || []);
          setLastUpdated(new Date());
        } else {
          const errorText = await response.text();
          console.error(`[fetchCampaigns] Failed: ${response.status} - ${errorText}`);
        }
      } catch (error) {
        console.error("[fetchCampaigns] Error:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [accessToken, accountId]
  );

  // Auto-fetch data when date range is loaded from localStorage and differs from "Today"
  // This ensures data matches the displayed date range after page refresh
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  useEffect(() => {
    // Wait until date range is initialized from localStorage
    if (!isDateRangeInitialized) return;
    
    // If we haven't done the initial fetch yet and date range is not "Today", fetch now
    if (!initialFetchDone && dateRange !== "Today" && accessToken && accountId) {
      setInitialFetchDone(true);
      console.log(`[MetaAdsTable] Auto-fetching data for saved date range: ${dateRange}`);
      fetchCampaigns(dateRange);
    } else if (!initialFetchDone) {
      setInitialFetchDone(true);
    }
  }, [isDateRangeInitialized, initialFetchDone, dateRange, accessToken, accountId, fetchCampaigns]);


  // Fetch Ad Sets for a campaign
  const fetchAdSets = useCallback(
    async (campaignId: string, selectedDateRange?: string) => {
      setIsLoading(true);
      const range = selectedDateRange || dateRange;
      try {
        const response = await fetch(
          `/api/meta/adsets?campaignId=${campaignId}&dateRange=${encodeURIComponent(range)}`,
          { headers: { "x-access-token": accessToken } }
        );
        if (response.ok) {
          const data = await response.json();
          setAdSets(data.adSets || []);
        } else {
          console.error("Failed to fetch ad sets");
          setAdSets([]);
        }
      } catch (error) {
        console.error("Error fetching ad sets:", error);
        setAdSets([]);
      } finally {
        setIsLoading(false);
      }
    },
    [accessToken, dateRange]
  );

  // Fetch Ads for an ad set
  const fetchAds = useCallback(
    async (adSetId: string, selectedDateRange?: string) => {
      setIsLoading(true);
      const range = selectedDateRange || dateRange;
      try {
        const response = await fetch(
          `/api/meta/ads?adSetId=${adSetId}&dateRange=${encodeURIComponent(range)}`,
          { headers: { "x-access-token": accessToken } }
        );
        if (response.ok) {
          const data = await response.json();
          setAds(data.ads || []);
        } else {
          console.error("Failed to fetch ads");
          setAds([]);
        }
      } catch (error) {
        console.error("Error fetching ads:", error);
        setAds([]);
      } finally {
        setIsLoading(false);
      }
    },
    [accessToken, dateRange]
  );

  // Refresh data
  const refreshData = useCallback(() => {
    setLastUpdated(new Date());
    // Re-fetch current level data
    if (viewLevel === "campaigns") {
      fetchCampaigns(dateRange);
    } else if (viewLevel === "adsets" && selectedCampaign) {
      fetchAdSets(selectedCampaign.id, dateRange);
    } else if (viewLevel === "ads" && selectedAdSet) {
      fetchAds(selectedAdSet.id, dateRange);
    }
  }, [viewLevel, selectedCampaign, selectedAdSet, fetchAdSets, fetchAds, fetchCampaigns, dateRange]);

  // Handle toggle campaign/adset/ad status
  const handleToggleStatus = useCallback(async (itemId: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
    setTogglingStatus(itemId);
    
    try {
      const endpoint = viewLevel === "campaigns" 
        ? `/api/meta/campaigns/${itemId}/status`
        : viewLevel === "adsets"
        ? `/api/meta/adsets/${itemId}/status`
        : `/api/meta/ads/${itemId}/status`;
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-access-token": accessToken,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (response.ok) {
        // Update local state
        if (viewLevel === "campaigns") {
          setCurrentCampaigns(prev => 
            prev.map(c => c.id === itemId ? { ...c, status: newStatus } : c)
          );
        } else if (viewLevel === "adsets") {
          setAdSets(prev => 
            prev.map(a => a.id === itemId ? { ...a, status: newStatus } : a)
          );
        } else {
          setAds(prev => 
            prev.map(a => a.id === itemId ? { ...a, status: newStatus } : a)
          );
        }
        toast.success(`${viewLevel === "campaigns" ? "Campaign" : viewLevel === "adsets" ? "Ad Set" : "Ad"} ${newStatus === "ACTIVE" ? "activated" : "paused"}`);
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to update status");
      }
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error("Failed to update status");
    } finally {
      setTogglingStatus(null);
    }
  }, [viewLevel, accessToken]);

  // Handle account switch
  const handleAccountSwitch = useCallback(async (account: AdAccount) => {
    if (account.account_id === currentAccountId) {
      setIsAccountDropdownOpen(false);
      return;
    }

    setIsSwitchingAccount(account.account_id);
    
    try {
      const result = await updateActiveAdAccount(
        account.account_id,
        account.name,
        account.business?.id,
        account.business?.name
      );
      
      if (result?.success) {
        setIsAccountDropdownOpen(false);
        toast.success(`Switched to ${account.name}`);
        router.refresh();
      } else {
        toast.error(result?.error || "Failed to switch account");
      }
    } catch (error) {
      console.error("Failed to switch account:", error);
      toast.error("Failed to switch account");
    } finally {
      setIsSwitchingAccount(null);
    }
  }, [currentAccountId, router]);

  // Handle date range change - fetch new data
  const handleDateRangeChange = useCallback(
    (newDateRange: string) => {
      setDateRange(newDateRange);
      setIsDatePickerOpen(false);
      
      // Fetch data for the new date range based on current view level
      if (viewLevel === "campaigns") {
        fetchCampaigns(newDateRange);
      } else if (viewLevel === "adsets" && selectedCampaign) {
        fetchCampaigns(newDateRange); // Also refresh campaigns
        fetchAdSets(selectedCampaign.id, newDateRange);
      } else if (viewLevel === "ads" && selectedAdSet) {
        fetchCampaigns(newDateRange); // Also refresh campaigns
        fetchAds(selectedAdSet.id, newDateRange);
      }
    },
    [viewLevel, selectedCampaign, selectedAdSet, fetchCampaigns, fetchAdSets, fetchAds]
  );

  // Breadcrumb navigation
  const breadcrumbs: BreadcrumbItem[] = useMemo(() => {
    const items: BreadcrumbItem[] = [{ level: "campaigns", name: "All Campaigns" }];
    if (selectedCampaign) {
      items.push({
        level: "adsets",
        id: selectedCampaign.id,
        name: selectedCampaign.name,
      });
    }
    if (selectedAdSet) {
      items.push({
        level: "ads",
        id: selectedAdSet.id,
        name: selectedAdSet.name,
      });
    }
    return items;
  }, [selectedCampaign, selectedAdSet]);

  // Handle campaign click -> show ad sets
  const handleCampaignClick = useCallback(
    (campaign: CampaignRow) => {
      setSelectedCampaign(campaign);
      setSelectedAdSet(null);
      setViewLevel("adsets");
      setSearchQuery("");
      setSortConfig(null);
      setStatusFilter("ALL");
      setSelectedIds(new Set());
      fetchAdSets(campaign.id);
    },
    [fetchAdSets]
  );

  // Handle ad set click -> show ads
  const handleAdSetClick = useCallback(
    (adSet: AdSetRow) => {
      setSelectedAdSet(adSet);
      setViewLevel("ads");
      setSearchQuery("");
      setSortConfig(null);
      setStatusFilter("ALL");
      setSelectedIds(new Set());
      fetchAds(adSet.id);
    },
    [fetchAds]
  );

  // Handle breadcrumb navigation
  const handleBreadcrumbClick = useCallback(
    (item: BreadcrumbItem) => {
      if (item.level === "campaigns") {
        setSelectedCampaign(null);
        setSelectedAdSet(null);
        setViewLevel("campaigns");
        setAdSets([]);
        setAds([]);
      } else if (item.level === "adsets" && selectedCampaign) {
        setSelectedAdSet(null);
        setViewLevel("adsets");
        setAds([]);
      }
      setSearchQuery("");
      setSortConfig(null);
      setStatusFilter("ALL");
      setSelectedIds(new Set());
    },
    [selectedCampaign]
  );

  // Filter and sort data
  const filteredData = useMemo(() => {
    let data: (CampaignRow | AdSetRow | AdRow)[] = [];

    if (viewLevel === "campaigns") {
      data = [...currentCampaigns];
    } else if (viewLevel === "adsets") {
      data = [...adSets];
    } else {
      data = [...ads];
    }

    // Filter by status
    if (statusFilter !== "ALL") {
      data = data.filter((item) =>
        statusFilter === "ACTIVE"
          ? item.status === "ACTIVE"
          : item.status !== "ACTIVE"
      );
    }

    // Filter by search
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      data = data.filter(
        (item) =>
          item.name.toLowerCase().includes(lowerQuery) ||
          item.id.includes(lowerQuery)
      );
    }

    // Always sort Active items first, then apply selected sort
    data.sort((a, b) => {
      // First: Active items come before Paused/Inactive
      const aIsActive = a.status === "ACTIVE" ? 0 : 1;
      const bIsActive = b.status === "ACTIVE" ? 0 : 1;
      
      if (aIsActive !== bIsActive) {
        return aIsActive - bIsActive;
      }
      
      // Then apply selected sort within each status group
      if (sortConfig) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const aVal = (a as any)[sortConfig.key];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bVal = (b as any)[sortConfig.key];

        let aValue: string | number = String(aVal ?? "");
        let bValue: string | number = String(bVal ?? "");

        // Numeric sorting for metrics
        if (
          [
            "spend",
            "impressions",
            "clicks",
            "cpc",
            "cpm",
            "ctr",
            "daily_budget",
            "lifetime_budget",
            "reach",
            "roas",
            "conversions",
            "cost_per_conversion",
            "results",
            "purchase_value",
          ].includes(sortConfig.key)
        ) {
          aValue = parseFloat(String(aValue) || "0");
          bValue = parseFloat(String(bValue) || "0");
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      }
      
      return 0;
    });

    return data;
  }, [viewLevel, currentCampaigns, adSets, ads, statusFilter, searchQuery, sortConfig]);

  // Selection handlers
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredData.map((item) => item.id)));
    }
  }, [filteredData, selectedIds]);

  const handleSelectItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        return current.direction === "asc" ? { key, direction: "desc" } : null;
      }
      return { key, direction: "asc" };
    });
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key !== columnKey)
      return <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50" />;
    return sortConfig.direction === "asc" ? (
      <ArrowUp className="w-3 h-3 text-blue-500" />
    ) : (
      <ArrowDown className="w-3 h-3 text-blue-500" />
    );
  };

  // Format budget display
  const formatBudget = (item: CampaignRow | AdSetRow) => {
    const daily = item.daily_budget;
    const lifetime = item.lifetime_budget;

    if (daily && parseFloat(daily) > 0) {
      return { amount: `$${(parseFloat(daily) / 100).toFixed(2)}`, type: "Daily" };
    }
    if (lifetime && parseFloat(lifetime) > 0) {
      return { amount: `$${(parseFloat(lifetime) / 100).toFixed(2)}`, type: "Lifetime" };
    }
    return { amount: "—", type: "" };
  };

  // Format metrics
  const formatMetric = (
    value: string | undefined,
    prefix: string = "",
    suffix: string = ""
  ) => {
    if (!value || value === "0" || parseFloat(value) === 0) return "—";
    const num = parseFloat(value);
    if (prefix === "$") return `$${num.toFixed(2)}`;
    if (suffix === "%") return `${num.toFixed(2)}%`;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  // Calculate totals for selected items
  const selectedTotals = useMemo(() => {
    const selected = filteredData.filter((item) => selectedIds.has(item.id));
    return {
      count: selected.length,
      spend: selected.reduce((sum, item) => sum + parseFloat(item.spend || "0"), 0),
      impressions: selected.reduce(
        (sum, item) => sum + parseInt(item.impressions || "0", 10),
        0
      ),
      clicks: selected.reduce(
        (sum, item) => sum + parseInt(item.clicks || "0", 10),
        0
      ),
      reach: selected.reduce(
        (sum, item) => sum + parseInt(item.reach || "0", 10),
        0
      ),
    };
  }, [filteredData, selectedIds]);

  // Date range options
  const dateRanges = [
    "Today",
    "Yesterday",
    "Last 7 Days",
    "Last 14 Days",
    "Last 30 Days",
    "Last 90 Days",
    "This Month",
    "Last Month",
    "This Year",
    "Last Year",
    "Maximum",
  ];

  // Toggle column visibility
  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Column definitions for the dropdown
  const columnDefinitions: { key: ColumnKey; label: string }[] = [
    { key: "offOn", label: "Off/On" },
    { key: "name", label: "Name" },
    { key: "delivery", label: "Delivery" },
    { key: "budget", label: "Budget" },
    { key: "results", label: "Results" },
    { key: "costPerResult", label: "Cost per Result" },
    { key: "amountSpent", label: "Amount Spent" },
    { key: "roas", label: "Purchase ROAS" },
    { key: "reach", label: "Reach" },
    { key: "impressions", label: "Impressions" },
    { key: "cpm", label: "CPM" },
    { key: "cpc", label: "CPC" },
    { key: "ctr", label: "CTR" },
    { key: "frequency", label: "Frequency" },
    { key: "ends", label: "Ends" },
  ];

  // Export functionality
  const handleExport = (format: "csv" | "excel" | "pdf") => {
    const dataToExport = selectedIds.size > 0 
      ? filteredData.filter(item => selectedIds.has(item.id))
      : filteredData;
    
    // For now, just log - in production you'd generate actual files
    console.log(`Exporting ${dataToExport.length} items as ${format}`);
    alert(`Export to ${format.toUpperCase()} - ${dataToExport.length} items selected`);
    setIsExportOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1c1c1e] overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
      {/* Meta Ads Manager Header */}
      <div className="bg-white dark:bg-[#242526] border-b border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Left side - Account selector */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <button 
                onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors",
                  isAccountDropdownOpen && "ring-2 ring-blue-500"
                )}
              >
                <div className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                  {accountName.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white max-w-[180px] truncate">
                  {accountName}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({accountId.replace("act_", "")})
                </span>
                <ChevronsUpDown className="w-4 h-4 text-gray-400" />
              </button>

              {/* Account Dropdown */}
              {isAccountDropdownOpen && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsAccountDropdownOpen(false)}
                  />
                  
                  {/* Dropdown Panel */}
                  <div className="absolute top-full left-0 w-[320px] mt-2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Switch Account</h3>
                        <span className="text-[10px] text-gray-500">
                          {adAccounts.length} accounts
                        </span>
                      </div>
                    </div>
                    
                    {/* Accounts List */}
                    <div className="max-h-[300px] overflow-y-auto p-2">
                      {adAccounts.length === 0 ? (
                        <div className="p-4 text-center">
                          <p className="text-sm text-gray-500">No accounts available</p>
                        </div>
                      ) : (
                        adAccounts.map((account) => {
                          const isSelected = account.account_id === currentAccountId;
                          const isAccountLoading = isSwitchingAccount === account.account_id;
                          
                          return (
                            <button
                              key={account.account_id}
                              onClick={() => handleAccountSwitch(account)}
                              disabled={isSwitchingAccount !== null}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                                isSelected
                                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-800"
                                  : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white",
                                isSwitchingAccount !== null && !isAccountLoading && "opacity-50"
                              )}
                            >
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0",
                                isSelected 
                                  ? "bg-blue-500 text-white" 
                                  : "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                              )}>
                                {account.name[0]?.toUpperCase() || "A"}
                              </div>
                              
                              <div className="flex-1 text-left min-w-0">
                                <span className="text-sm font-medium block truncate">
                                  {account.name}
                                </span>
                                <span className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                  {account.business?.name && (
                                    <>
                                      <Building2 className="w-3 h-3" />
                                      <span className="truncate">{account.business.name}</span>
                                    </>
                                  )}
                                </span>
                              </div>

                              {isAccountLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                              ) : isSelected ? (
                                <Check className="w-4 h-4 text-blue-500" />
                              ) : null}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Opportunity score */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 dark:bg-green-900/20 rounded-full">
              <Gauge className="w-4 h-4 text-green-600" />
              <span className="text-xs font-medium text-green-700 dark:text-green-400">72</span>
              <span className="text-xs text-gray-500">Opportunity score</span>
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              Updated {lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--"}
            </span>
            <button
              onClick={refreshData}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
              Review and publish
            </button>
            <button className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
              Create a view
            </button>
          </div>
        </div>
      </div>

      {/* Breadcrumb Navigation - Only show when drilling down */}
      {(selectedCampaign || selectedAdSet) && (
        <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-2 bg-gray-50 dark:bg-[#1c1c1e]">
          <nav className="flex items-center gap-1 text-sm">
            {breadcrumbs.map((item, index) => (
              <div key={item.level + (item.id || "")} className="flex items-center">
                {index > 0 && (
                  <ChevronRight className="w-4 h-4 mx-1 text-gray-400" />
                )}
                <button
                  onClick={() => handleBreadcrumbClick(item)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-md transition-colors",
                    index === breadcrumbs.length - 1
                      ? "text-gray-900 dark:text-white font-medium bg-white dark:bg-gray-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  {index === 0 && <Home className="w-3.5 h-3.5" />}
                  <span className="max-w-[200px] truncate">{item.name}</span>
                </button>
              </div>
            ))}
          </nav>
        </div>
      )}

      {/* Tabs with selection badges */}
      <div className="flex items-center border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#242526] px-4">
        <button
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px cursor-pointer",
            viewLevel === "campaigns"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          )}
          onClick={() => {
            // Always navigate to campaigns view when clicked
            setSelectedCampaign(null);
            setSelectedAdSet(null);
            setViewLevel("campaigns");
            setAdSets([]);
            setAds([]);
            setSearchQuery("");
            setSortConfig(null);
            setStatusFilter("ALL");
            setSelectedIds(new Set());
          }}
        >
          <LayoutGrid className="w-4 h-4" />
          Campaigns
          {viewLevel === "campaigns" && selectedIds.size > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-500 text-white rounded">
              {selectedIds.size} selected
            </span>
          )}
          <span className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">
            {currentCampaigns.length}
          </span>
        </button>
        <button
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px",
            viewLevel === "adsets"
              ? "border-blue-500 text-blue-600"
              : selectedCampaign 
                ? "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                : "border-transparent text-gray-400 cursor-not-allowed opacity-50"
          )}
          onClick={() => {
            if (selectedCampaign && viewLevel !== "adsets") {
              setSelectedAdSet(null);
              setViewLevel("adsets");
              setAds([]);
              setSearchQuery("");
              setSortConfig(null);
              setStatusFilter("ALL");
              setSelectedIds(new Set());
            }
          }}
          disabled={!selectedCampaign}
        >
          <Target className="w-4 h-4" />
          Ad sets
          {viewLevel === "adsets" && selectedIds.size > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-500 text-white rounded">
              {selectedIds.size} selected
            </span>
          )}
          {adSets.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">
              {adSets.length}
            </span>
          )}
        </button>
        <button
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px",
            viewLevel === "ads"
              ? "border-blue-500 text-blue-600"
              : selectedAdSet 
                ? "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                : "border-transparent text-gray-400 cursor-not-allowed opacity-50"
          )}
          disabled={!selectedAdSet}
        >
          <FileText className="w-4 h-4" />
          Ads
          {viewLevel === "ads" && selectedIds.size > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-500 text-white rounded">
              {selectedIds.size} selected
            </span>
          )}
          {ads.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">
              {ads.length}
            </span>
          )}
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Date range picker */}
        <div className="relative" ref={datePickerRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsDatePickerOpen(!isDatePickerOpen);
            }}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            <Calendar className="w-4 h-4" />
            <span>{dateRange}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {isDatePickerOpen && (
            <div 
              className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1"
            >
              {dateRanges.map((range) => (
                <button
                  key={range}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDateRangeChange(range);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between",
                    dateRange === range && "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                  )}
                >
                  {range}
                  {dateRange === range && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-2 flex items-center gap-2 bg-white dark:bg-[#242526]">
        {/* Primary actions */}
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Create
        </button>

        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

        <button
          disabled={selectedIds.size === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Copy className="w-4 h-4" />
          Duplicate
          <ChevronDown className="w-3 h-3" />
        </button>

        <button
          disabled={selectedIds.size === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Pencil className="w-4 h-4" />
          Edit
          <ChevronDown className="w-3 h-3" />
        </button>

        <button
          disabled={selectedIds.size === 0}
          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
          <FlaskConical className="w-4 h-4" />
          A/B test
        </button>

        {/* More dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            More
            <ChevronDown className="w-3 h-3" />
          </button>
          {isMoreOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setIsMoreOpen(false)} />
              <div className="absolute left-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-40 py-1">
                <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  View performance
                </button>
                <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Ad rules
                </button>
                <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                  <EyeOff className="w-4 h-4" />
                  Turn off
                </button>
              </div>
            </>
          )}
        </div>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 border-0 rounded-lg w-52 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filter dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
              statusFilter !== "ALL"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                : "text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
            )}
          >
            <Filter className="w-4 h-4" />
            {statusFilter === "ALL"
              ? "Filter"
              : statusFilter === "ACTIVE"
              ? "Active"
              : "Inactive"}
            <ChevronDown className="w-3 h-3" />
          </button>
          {isFilterOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setIsFilterOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-40 py-1">
                <button
                  onClick={() => {
                    setStatusFilter("ALL");
                    setIsFilterOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between",
                    statusFilter === "ALL" && "bg-blue-50 dark:bg-blue-900/20 text-blue-600"
                  )}
                >
                  All
                  {statusFilter === "ALL" && <Check className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => {
                    setStatusFilter("ACTIVE");
                    setIsFilterOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between",
                    statusFilter === "ACTIVE" && "bg-blue-50 dark:bg-blue-900/20 text-blue-600"
                  )}
                >
                  Active only
                  {statusFilter === "ACTIVE" && <Check className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => {
                    setStatusFilter("PAUSED");
                    setIsFilterOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between",
                    statusFilter === "PAUSED" && "bg-blue-50 dark:bg-blue-900/20 text-blue-600"
                  )}
                >
                  Inactive only
                  {statusFilter === "PAUSED" && <Check className="w-4 h-4" />}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

        {/* Columns dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsColumnsOpen(!isColumnsOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            <Columns className="w-4 h-4" />
            Columns: main
            <ChevronDown className="w-3 h-3" />
          </button>
          {isColumnsOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setIsColumnsOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-40 py-2 max-h-80 overflow-y-auto">
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                  Show/Hide Columns
                </div>
                {columnDefinitions.map((col) => (
                  <button
                    key={col.key}
                    onClick={() => toggleColumn(col.key)}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
                  >
                    <span>{col.label}</span>
                    <div
                      className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                        visibleColumns[col.key]
                          ? "bg-blue-500 border-blue-500"
                          : "border-gray-300 dark:border-gray-600"
                      )}
                    >
                      {visibleColumns[col.key] && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Breakdown dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsBreakdownOpen(!isBreakdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            Breakdown
            <ChevronDown className="w-3 h-3" />
          </button>
          {isBreakdownOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setIsBreakdownOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-40 py-1">
                <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                  By delivery
                </button>
                <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                  By time
                </button>
                <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                  By action
                </button>
                <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                  By dynamic creative
                </button>
              </div>
            </>
          )}
        </div>

        {/* Reports */}
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
          <FileText className="w-4 h-4" />
          Reports
          <ChevronDown className="w-3 h-3" />
        </button>

        {/* Export dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsExportOpen(!isExportOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
            <ChevronDown className="w-3 h-3" />
          </button>
          {isExportOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setIsExportOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-40 py-1">
                <button 
                  onClick={() => handleExport('csv')}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Export to CSV
                </button>
                <button 
                  onClick={() => handleExport('excel')}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Export to Excel
                </button>
                <button 
                  onClick={() => handleExport('pdf')}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Export to PDF
                </button>
              </div>
            </>
          )}
        </div>

        {/* Charts toggle */}
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
          <LineChart className="w-4 h-4" />
          Charts
        </button>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-black/50 flex items-center justify-center z-20">
          <div className="flex items-center gap-3 bg-white dark:bg-gray-800 px-4 py-3 rounded-lg shadow-lg">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Loading {viewLevel}...
            </span>
          </div>
        </div>
      )}

      {/* Table Area */}
      <div className="flex-1 overflow-auto relative">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 dark:bg-[#1c1c1e] sticky top-0 z-10 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <tr>
              <th className="p-3 border-b border-gray-200 dark:border-gray-700 w-10 bg-gray-50 dark:bg-[#1c1c1e]">
                <input
                  type="checkbox"
                  checked={
                    filteredData.length > 0 &&
                    selectedIds.size === filteredData.length
                  }
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>

              {visibleColumns.offOn && (
                <th className="p-3 border-b border-gray-200 dark:border-gray-700 w-12 bg-gray-50 dark:bg-[#1c1c1e]">
                  Off/On
                </th>
              )}

              {visibleColumns.name && (
                <th
                  className="p-3 border-b border-gray-200 dark:border-gray-700 min-w-[280px] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 group bg-gray-50 dark:bg-[#1c1c1e] transition-colors"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-1">
                    {viewLevel === "campaigns"
                      ? "Campaign"
                      : viewLevel === "adsets"
                      ? "Ad set"
                      : "Ad"}
                    <SortIcon columnKey="name" />
                  </div>
                </th>
              )}

              {visibleColumns.delivery && (
                <th
                  className="p-3 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 group bg-gray-50 dark:bg-[#1c1c1e] transition-colors"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center gap-1">
                    Delivery
                    <SortIcon columnKey="status" />
                  </div>
                </th>
              )}

              {visibleColumns.budget && (
                <th
                  className="p-3 border-b border-gray-200 dark:border-gray-700 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 group bg-gray-50 dark:bg-[#1c1c1e] transition-colors"
                  onClick={() => handleSort("daily_budget")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Budget
                    <SortIcon columnKey="daily_budget" />
                  </div>
                </th>
              )}

              {visibleColumns.results && (
                <th className="p-3 border-b border-gray-200 dark:border-gray-700 text-right bg-gray-50 dark:bg-[#1c1c1e]">
                  Results
                </th>
              )}

              {visibleColumns.costPerResult && (
                <th className="p-3 border-b border-gray-200 dark:border-gray-700 text-right bg-gray-50 dark:bg-[#1c1c1e]">
                  Cost per result
                </th>
              )}

              {visibleColumns.amountSpent && (
                <th
                  className="p-3 border-b border-gray-200 dark:border-gray-700 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 group bg-gray-50 dark:bg-[#1c1c1e] transition-colors"
                  onClick={() => handleSort("spend")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Amount spent
                    <SortIcon columnKey="spend" />
                  </div>
                </th>
              )}

              {visibleColumns.roas && (
                <th className="p-3 border-b border-gray-200 dark:border-gray-700 text-right bg-gray-50 dark:bg-[#1c1c1e]">
                  Purchase ROAS
                </th>
              )}

              {visibleColumns.reach && (
                <th
                  className="p-3 border-b border-gray-200 dark:border-gray-700 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 group bg-gray-50 dark:bg-[#1c1c1e] transition-colors"
                  onClick={() => handleSort("reach")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Reach
                    <SortIcon columnKey="reach" />
                  </div>
                </th>
              )}

              {visibleColumns.impressions && (
                <th
                  className="p-3 border-b border-gray-200 dark:border-gray-700 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 group bg-gray-50 dark:bg-[#1c1c1e] transition-colors"
                  onClick={() => handleSort("impressions")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Impressions
                    <SortIcon columnKey="impressions" />
                  </div>
                </th>
              )}

              {visibleColumns.cpm && (
                <th
                  className="p-3 border-b border-gray-200 dark:border-gray-700 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 group bg-gray-50 dark:bg-[#1c1c1e] transition-colors"
                  onClick={() => handleSort("cpm")}
                >
                  <div className="flex items-center justify-end gap-1">
                    CPM
                    <SortIcon columnKey="cpm" />
                  </div>
                </th>
              )}

              {visibleColumns.cpc && (
                <th
                  className="p-3 border-b border-gray-200 dark:border-gray-700 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 group bg-gray-50 dark:bg-[#1c1c1e] transition-colors"
                  onClick={() => handleSort("cpc")}
                >
                  <div className="flex items-center justify-end gap-1">
                    CPC
                    <SortIcon columnKey="cpc" />
                  </div>
                </th>
              )}

              {visibleColumns.ctr && (
                <th
                  className="p-3 border-b border-gray-200 dark:border-gray-700 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 group bg-gray-50 dark:bg-[#1c1c1e] transition-colors"
                  onClick={() => handleSort("ctr")}
                >
                  <div className="flex items-center justify-end gap-1">
                    CTR
                    <SortIcon columnKey="ctr" />
                  </div>
                </th>
              )}

              {visibleColumns.frequency && (
                <th className="p-3 border-b border-gray-200 dark:border-gray-700 text-right bg-gray-50 dark:bg-[#1c1c1e]">
                  Frequency
                </th>
              )}

              {visibleColumns.ends && (
                <th className="p-3 border-b border-gray-200 dark:border-gray-700 text-right bg-gray-50 dark:bg-[#1c1c1e]">
                  Ends
                </th>
              )}

              <th className="p-3 border-b border-gray-200 dark:border-gray-700 w-10 bg-gray-50 dark:bg-[#1c1c1e]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredData.length === 0 ? (
              <tr>
                <td
                  colSpan={20}
                  className="p-12 text-center text-gray-500"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Search className="w-10 h-10 text-gray-300" />
                    <p className="text-lg font-medium">No {viewLevel} found</p>
                    <p className="text-sm">
                      Try adjusting your filters or search query
                    </p>
                    {(searchQuery || statusFilter !== "ALL") && (
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setStatusFilter("ALL");
                        }}
                        className="mt-2 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredData.map((item) => {
                const budget = formatBudget(item as CampaignRow | AdSetRow);
                const isCampaign = viewLevel === "campaigns";
                const isAdSet = viewLevel === "adsets";
                const isSelected = selectedIds.has(item.id);

                return (
                  <tr
                    key={item.id}
                    className={cn(
                      "hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group text-sm",
                      isSelected && "bg-blue-50 dark:bg-blue-900/20"
                    )}
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectItem(item.id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>

                    {visibleColumns.offOn && (
                      <td className="p-3">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStatus(item.id, item.status);
                          }}
                          disabled={togglingStatus === item.id}
                          className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                        >
                          {togglingStatus === item.id ? (
                            <div className="w-9 h-5 bg-gray-400 rounded-full relative shadow-inner flex items-center justify-center">
                              <Loader2 className="w-3 h-3 animate-spin text-white" />
                            </div>
                          ) : item.status === "ACTIVE" ? (
                            <div className="w-9 h-5 bg-blue-500 rounded-full relative shadow-inner cursor-pointer hover:bg-blue-600 transition-colors">
                              <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform" />
                            </div>
                          ) : (
                            <div className="w-9 h-5 bg-gray-300 dark:bg-gray-600 rounded-full relative shadow-inner cursor-pointer hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors">
                              <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform" />
                            </div>
                          )}
                        </button>
                      </td>
                    )}

                    {visibleColumns.name && (
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <button
                            className="text-left font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
                            onClick={() => {
                              if (isCampaign)
                                handleCampaignClick(item as CampaignRow);
                              else if (isAdSet)
                                handleAdSetClick(item as AdSetRow);
                            }}
                            disabled={viewLevel === "ads"}
                          >
                            <div className="flex items-center gap-2">
                              <span className="max-w-[220px] truncate">
                                {item.name}
                              </span>
                              {(isCampaign || isAdSet) && (
                                <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </div>
                          </button>
                          {/* Hover actions like Meta */}
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                            <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title="View charts">
                              <LineChart className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                            <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title="Duplicate">
                              <Copy className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                            <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title="Edit">
                              <Pencil className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                          </div>
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2">
                          <span>{item.id}</span>
                          {isCampaign && (item as CampaignRow).objective && (
                            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px]">
                              {(item as CampaignRow).objective}
                            </span>
                          )}
                        </div>
                      </td>
                    )}

                    {visibleColumns.delivery && (
                      <td className="p-3">
                        <span
                          className={cn(
                            "text-xs px-2 py-1 rounded-full border inline-flex items-center gap-1 font-medium",
                            item.status === "ACTIVE"
                              ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                              : "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600"
                          )}
                        >
                          {item.status === "ACTIVE" ? (
                            <Play className="w-2.5 h-2.5 fill-current" />
                          ) : (
                            <Pause className="w-2.5 h-2.5" />
                          )}
                          {item.status === "ACTIVE" ? "Active" : "Off"}
                        </span>
                      </td>
                    )}

                    {visibleColumns.budget && (
                      <td className="p-3 text-right">
                        <div className="text-gray-900 dark:text-white font-mono text-sm">
                          {budget.amount}
                        </div>
                        {budget.type && (
                          <div className="text-[11px] text-gray-500">
                            {budget.type}
                          </div>
                        )}
                      </td>
                    )}

                    {visibleColumns.results && (
                      <td className="p-3 text-right text-gray-700 dark:text-gray-300 font-mono">
                        <span className="text-lg font-semibold">
                          {(item as CampaignRow | AdSetRow | AdRow).results || "0"}
                        </span>
                        <div className="text-[11px] text-gray-500">
                          Purchases
                        </div>
                      </td>
                    )}

                    {visibleColumns.costPerResult && (
                      <td className="p-3 text-right text-gray-700 dark:text-gray-300 font-mono">
                        {formatMetric((item as CampaignRow).cost_per_conversion, "$")}
                        <div className="text-[11px] text-gray-500">
                          Per Purchase
                        </div>
                      </td>
                    )}

                    {visibleColumns.amountSpent && (
                      <td className="p-3 text-right text-gray-900 dark:text-white font-mono font-medium">
                        {formatMetric(item.spend, "$")}
                      </td>
                    )}

                    {visibleColumns.roas && (
                      <td className="p-3 text-right text-gray-700 dark:text-gray-300 font-mono">
                        {formatMetric((item as CampaignRow).roas)}
                      </td>
                    )}

                    {visibleColumns.reach && (
                      <td className="p-3 text-right text-gray-700 dark:text-gray-300 font-mono">
                        {formatMetric(item.reach)}
                      </td>
                    )}

                    {visibleColumns.impressions && (
                      <td className="p-3 text-right text-gray-700 dark:text-gray-300 font-mono">
                        {formatMetric(item.impressions)}
                      </td>
                    )}

                    {visibleColumns.cpm && (
                      <td className="p-3 text-right text-gray-700 dark:text-gray-300 font-mono">
                        {formatMetric(item.cpm, "$")}
                      </td>
                    )}

                    {visibleColumns.cpc && (
                      <td className="p-3 text-right text-gray-700 dark:text-gray-300 font-mono">
                        {formatMetric(item.cpc, "$")}
                      </td>
                    )}

                    {visibleColumns.ctr && (
                      <td className="p-3 text-right text-gray-700 dark:text-gray-300 font-mono">
                        {formatMetric(item.ctr, "", "%")}
                      </td>
                    )}

                    {visibleColumns.frequency && (
                      <td className="p-3 text-right text-gray-700 dark:text-gray-300 font-mono">
                        {formatMetric((item as CampaignRow).frequency)}
                      </td>
                    )}

                    {visibleColumns.ends && (
                      <td className="p-3 text-right text-gray-500 text-xs">
                        {(item as CampaignRow).stop_time
                          ? new Date(
                              (item as CampaignRow).stop_time!
                            ).toLocaleDateString()
                          : "Ongoing"}
                      </td>
                    )}

                    <td className="p-3 text-right">
                      <button className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-all">
                        <MoreHorizontal className="w-4 h-4 text-gray-500" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1c1c1e] px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-gray-600 dark:text-gray-400">
              Results from{" "}
              <span className="font-medium text-gray-900 dark:text-white">
                {filteredData.length} {viewLevel}
              </span>
            </span>
            {selectedIds.size > 0 && (
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-md text-xs font-medium">
                {selectedIds.size} selected
              </span>
            )}
          </div>

          {/* Totals row when items selected */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-6 text-gray-600 dark:text-gray-400">
              <div>
                <span className="text-xs">Total Spent:</span>
                <span className="ml-2 font-mono font-medium text-gray-900 dark:text-white">
                  ${selectedTotals.spend.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-xs">Total Reach:</span>
                <span className="ml-2 font-mono font-medium text-gray-900 dark:text-white">
                  {formatMetric(String(selectedTotals.reach))}
                </span>
              </div>
              <div>
                <span className="text-xs">Total Impressions:</span>
                <span className="ml-2 font-mono font-medium text-gray-900 dark:text-white">
                  {formatMetric(String(selectedTotals.impressions))}
                </span>
              </div>
            </div>
          )}

          {/* Pagination hint */}
          <div className="text-gray-500 text-xs">
            Showing 1-{filteredData.length} of {filteredData.length}
          </div>
        </div>
      </div>
    </div>
  );
}

