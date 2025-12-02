"use client";

import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Calendar, 
  Search, 
  RefreshCw,
  Sparkles,
  Target,
  AlertCircle
} from "lucide-react";

type EmptyStateType = 
  | "no-data" 
  | "no-campaigns" 
  | "no-results" 
  | "error" 
  | "loading-failed"
  | "no-insights"
  | "no-audience"
  | "date-range-empty";

interface EmptyStateProps {
  type: EmptyStateType;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

// SVG Illustrations for empty states
const NoDataIllustration = () => (
  <svg
    className="w-32 h-32 mx-auto mb-6"
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Background circle */}
    <circle cx="100" cy="100" r="80" className="fill-gray-100 dark:fill-gray-800" />
    {/* Chart bars */}
    <rect x="60" y="110" width="20" height="40" rx="4" className="fill-gray-300 dark:fill-gray-600" />
    <rect x="90" y="90" width="20" height="60" rx="4" className="fill-gray-300 dark:fill-gray-600" />
    <rect x="120" y="100" width="20" height="50" rx="4" className="fill-gray-300 dark:fill-gray-600" />
    {/* Dashed line */}
    <path
      d="M50 80 Q100 60 150 80"
      stroke="currentColor"
      strokeWidth="2"
      strokeDasharray="6 4"
      className="text-blue-400 dark:text-blue-500"
      fill="none"
    />
    {/* Question mark */}
    <text
      x="100"
      y="75"
      textAnchor="middle"
      className="fill-blue-500 dark:fill-blue-400"
      fontSize="24"
      fontWeight="bold"
    >
      ?
    </text>
  </svg>
);

const NoCampaignsIllustration = () => (
  <svg
    className="w-32 h-32 mx-auto mb-6"
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Background */}
    <circle cx="100" cy="100" r="80" className="fill-purple-50 dark:fill-purple-900/20" />
    {/* Folder */}
    <path
      d="M60 80 L60 140 L140 140 L140 90 L110 90 L100 80 Z"
      className="fill-purple-200 dark:fill-purple-800"
    />
    <path
      d="M60 90 L60 140 L140 140 L140 90 Z"
      className="fill-purple-300 dark:fill-purple-700"
    />
    {/* Plus icon */}
    <circle cx="100" cy="115" r="18" className="fill-purple-500 dark:fill-purple-400" />
    <path
      d="M100 107 V123 M92 115 H108"
      stroke="white"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

const NoResultsIllustration = () => (
  <svg
    className="w-32 h-32 mx-auto mb-6"
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Background */}
    <circle cx="100" cy="100" r="80" className="fill-amber-50 dark:fill-amber-900/20" />
    {/* Magnifying glass */}
    <circle
      cx="90"
      cy="90"
      r="35"
      className="stroke-amber-400 dark:stroke-amber-500"
      strokeWidth="6"
      fill="none"
    />
    <path
      d="M115 115 L140 140"
      className="stroke-amber-400 dark:stroke-amber-500"
      strokeWidth="8"
      strokeLinecap="round"
    />
    {/* X inside magnifying glass */}
    <path
      d="M80 80 L100 100 M100 80 L80 100"
      className="stroke-amber-300 dark:stroke-amber-600"
      strokeWidth="4"
      strokeLinecap="round"
    />
  </svg>
);

const ErrorIllustration = () => (
  <svg
    className="w-32 h-32 mx-auto mb-6"
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Background */}
    <circle cx="100" cy="100" r="80" className="fill-red-50 dark:fill-red-900/20" />
    {/* Alert triangle */}
    <path
      d="M100 60 L140 130 L60 130 Z"
      className="fill-red-100 dark:fill-red-900/40 stroke-red-500 dark:stroke-red-400"
      strokeWidth="4"
      strokeLinejoin="round"
    />
    {/* Exclamation mark */}
    <path
      d="M100 85 V105"
      className="stroke-red-500 dark:stroke-red-400"
      strokeWidth="6"
      strokeLinecap="round"
    />
    <circle cx="100" cy="118" r="4" className="fill-red-500 dark:fill-red-400" />
  </svg>
);

const NoInsightsIllustration = () => (
  <svg
    className="w-32 h-32 mx-auto mb-6"
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Background */}
    <circle cx="100" cy="100" r="80" className="fill-indigo-50 dark:fill-indigo-900/20" />
    {/* Brain/lightbulb hybrid */}
    <circle cx="100" cy="85" r="35" className="fill-indigo-200 dark:fill-indigo-800" />
    <path
      d="M85 120 L85 140 L115 140 L115 120"
      className="fill-indigo-300 dark:fill-indigo-700"
    />
    {/* Sparkles */}
    <circle cx="60" cy="70" r="4" className="fill-indigo-400 dark:fill-indigo-500" />
    <circle cx="140" cy="80" r="3" className="fill-indigo-400 dark:fill-indigo-500" />
    <circle cx="130" cy="60" r="5" className="fill-indigo-400 dark:fill-indigo-500" />
    {/* Z's for sleeping/inactive */}
    <text x="145" y="50" className="fill-indigo-400 dark:fill-indigo-500 text-lg font-bold">z</text>
    <text x="155" y="40" className="fill-indigo-400 dark:fill-indigo-500 text-sm font-bold">z</text>
  </svg>
);

const DateRangeEmptyIllustration = () => (
  <svg
    className="w-32 h-32 mx-auto mb-6"
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Background */}
    <circle cx="100" cy="100" r="80" className="fill-teal-50 dark:fill-teal-900/20" />
    {/* Calendar */}
    <rect
      x="60"
      y="70"
      width="80"
      height="70"
      rx="8"
      className="fill-teal-200 dark:fill-teal-800"
    />
    <rect
      x="60"
      y="70"
      width="80"
      height="20"
      rx="8"
      className="fill-teal-400 dark:fill-teal-600"
    />
    {/* Calendar rings */}
    <rect x="80" y="60" width="4" height="20" rx="2" className="fill-teal-500 dark:fill-teal-500" />
    <rect x="116" y="60" width="4" height="20" rx="2" className="fill-teal-500 dark:fill-teal-500" />
    {/* Empty days */}
    <rect x="70" y="100" width="12" height="12" rx="2" className="fill-teal-100 dark:fill-teal-900/40" />
    <rect x="90" y="100" width="12" height="12" rx="2" className="fill-teal-100 dark:fill-teal-900/40" />
    <rect x="110" y="100" width="12" height="12" rx="2" className="fill-teal-100 dark:fill-teal-900/40" />
    <rect x="70" y="118" width="12" height="12" rx="2" className="fill-teal-100 dark:fill-teal-900/40" />
    <rect x="90" y="118" width="12" height="12" rx="2" className="fill-teal-100 dark:fill-teal-900/40" />
    <rect x="110" y="118" width="12" height="12" rx="2" className="fill-teal-100 dark:fill-teal-900/40" />
  </svg>
);

const EMPTY_STATE_CONFIG: Record<
  EmptyStateType,
  {
    illustration: React.ReactNode;
    icon: React.ReactNode;
    defaultTitle: string;
    defaultDescription: string;
    suggestions?: string[];
  }
> = {
  "no-data": {
    illustration: <NoDataIllustration />,
    icon: <BarChart3 className="h-6 w-6 text-gray-400" />,
    defaultTitle: "No Performance Data",
    defaultDescription: "There's no data available for the selected period. This could mean your campaigns had no activity.",
    suggestions: [
      "Try selecting a broader date range",
      "Check if your campaigns are active",
      "Verify your ad account connection",
    ],
  },
  "no-campaigns": {
    illustration: <NoCampaignsIllustration />,
    icon: <Target className="h-6 w-6 text-purple-400" />,
    defaultTitle: "No Campaigns Found",
    defaultDescription: "You don't have any campaigns in your account yet. Create your first campaign to start seeing insights.",
    suggestions: [
      "Create a new campaign in Meta Ads Manager",
      "Check your ad account permissions",
      "Ensure your account is properly connected",
    ],
  },
  "no-results": {
    illustration: <NoResultsIllustration />,
    icon: <Search className="h-6 w-6 text-amber-400" />,
    defaultTitle: "No Results Found",
    defaultDescription: "Your search or filters didn't match any campaigns. Try adjusting your criteria.",
    suggestions: [
      "Clear some filters to broaden your search",
      "Check your spelling if searching by name",
      "Remove date restrictions",
    ],
  },
  "error": {
    illustration: <ErrorIllustration />,
    icon: <AlertCircle className="h-6 w-6 text-red-400" />,
    defaultTitle: "Something Went Wrong",
    defaultDescription: "We encountered an error while loading your data. Please try again.",
    suggestions: [
      "Check your internet connection",
      "Refresh the page",
      "Contact support if the issue persists",
    ],
  },
  "loading-failed": {
    illustration: <ErrorIllustration />,
    icon: <RefreshCw className="h-6 w-6 text-red-400" />,
    defaultTitle: "Failed to Load Data",
    defaultDescription: "We couldn't load your insights data. This might be a temporary issue.",
    suggestions: [
      "Try refreshing the page",
      "Check your network connection",
      "The Meta API might be experiencing issues",
    ],
  },
  "no-insights": {
    illustration: <NoInsightsIllustration />,
    icon: <Sparkles className="h-6 w-6 text-indigo-400" />,
    defaultTitle: "No AI Insights Available",
    defaultDescription: "There's not enough data to generate meaningful insights. Keep running your campaigns!",
    suggestions: [
      "Allow more time for data collection",
      "Increase campaign activity",
      "Check back after more conversions",
    ],
  },
  "no-audience": {
    illustration: <NoDataIllustration />,
    icon: <Users className="h-6 w-6 text-blue-400" />,
    defaultTitle: "No Audience Data",
    defaultDescription: "Audience breakdown data isn't available for this selection. Try a different breakdown.",
    suggestions: [
      "Select a different breakdown type",
      "Expand your date range",
      "Wait for more audience data to accumulate",
    ],
  },
  "date-range-empty": {
    illustration: <DateRangeEmptyIllustration />,
    icon: <Calendar className="h-6 w-6 text-teal-400" />,
    defaultTitle: "No Activity in This Period",
    defaultDescription: "Your campaigns had no activity during the selected date range.",
    suggestions: [
      "Select 'Last 30 Days' for a broader view",
      "Try 'Maximum' to see all historical data",
      "Check if campaigns were paused during this period",
    ],
  },
};

export function EmptyState({
  type,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  const config = EMPTY_STATE_CONFIG[type];

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-scale-up">
      {/* Illustration */}
      {config.illustration}

      {/* Icon Badge */}
      <div className="mb-4 p-3 rounded-full bg-gray-100 dark:bg-gray-800">
        {config.icon}
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title || config.defaultTitle}
      </h3>

      {/* Description */}
      <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mb-4">
        {description || config.defaultDescription}
      </p>

      {/* Suggestions */}
      {config.suggestions && config.suggestions.length > 0 && (
        <div className="mb-6 text-left max-w-sm">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-500 mb-2 uppercase tracking-wide">
            Try this:
          </p>
          <ul className="space-y-1">
            {config.suggestions.map((suggestion, index) => (
              <li
                key={index}
                className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2"
              >
                <span className="text-blue-500 mt-1">•</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            <Button onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

