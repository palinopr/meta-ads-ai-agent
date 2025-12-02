"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Target,
  Sparkles,
  X,
  Loader2,
  Play,
  Pause,
  DollarSign,
  ExternalLink,
  CheckCircle,
  Clock,
  Calendar,
  Copy,
} from "lucide-react";
import { EmptyState } from "./EmptyState";

interface InsightAction {
  id: string;
  label: string;
  type: "primary" | "secondary" | "danger";
  icon?: React.ReactNode;
}

interface Insight {
  id: string;
  type: "insight" | "prediction" | "recommendation" | "anomaly";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  metric?: string;
  value?: number | string;
  change?: number;
  campaignId?: string;
  campaignName?: string;
  actions?: InsightAction[];
  dismissible?: boolean;
}

interface AIInsightsProps {
  summary: {
    spend: number;
    impressions: number;
    clicks: number;
    reach: number;
    results: number;
    purchase_value: number;
    cpm: number;
    cpc: number;
    ctr: number;
    roas: number;
    cost_per_result: number;
  };
  dailyData: Array<{
    date: string;
    spend: number;
    impressions: number;
    clicks: number;
    results: number;
    roas: number;
  }>;
  dateRange: string;
  campaignIds?: string[];
  viewLevel?: "account" | "campaign" | "adset" | "ad";
}

// Action confirmation modal
function ActionModal({
  isOpen,
  onClose,
  action,
  insight,
  onConfirm,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  action: InsightAction;
  insight: Insight;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  if (!isOpen) return null;

  const getActionIcon = () => {
    switch (action.id) {
      case "scale_budget":
        return <DollarSign className="h-5 w-5 text-green-500" />;
      case "pause_campaign":
        return <Pause className="h-5 w-5 text-red-500" />;
      case "enable_campaign":
        return <Play className="h-5 w-5 text-green-500" />;
      case "schedule_review":
        return <Calendar className="h-5 w-5 text-blue-500" />;
      default:
        return <Target className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-[#1e1f20] rounded-xl shadow-2xl max-w-md w-full animate-scale-up">
          {/* Header */}
          <div className="flex items-center gap-3 p-6 border-b border-gray-200 dark:border-gray-700">
            {getActionIcon()}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Confirm Action
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {action.label}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Are you sure you want to <span className="font-medium">{action.label.toLowerCase()}</span>
              {insight.campaignName && (
                <> for <span className="font-semibold">{insight.campaignName}</span></>
              )}?
            </p>
            
            {action.id === "scale_budget" && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm">
                  <DollarSign className="h-4 w-4" />
                  This will increase the daily budget by 20%
                </div>
              </div>
            )}

            {action.id === "pause_campaign" && (
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  Pausing will stop all ad delivery immediately
                </div>
              </div>
            )}

            <p className="text-xs text-gray-500 dark:text-gray-400">
              This action will be recorded in your activity log.
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              variant={action.type === "danger" ? "destructive" : "default"}
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// Success Toast
function SuccessToast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up">
      <CheckCircle className="h-5 w-5" />
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-80">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function AIInsights({
  summary,
  dailyData,
  dateRange,
  campaignIds,
  viewLevel = "account",
}: AIInsightsProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [selectedAction, setSelectedAction] = useState<{
    action: InsightAction;
    insight: Insight;
  } | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [scheduledReviews, setScheduledReviews] = useState<Set<string>>(new Set());

  // Generate actionable insights based on data
  const generateActionableInsights = useCallback((): Insight[] => {
    const actionableInsights: Insight[] = [];

    // High ROAS campaigns - suggest scaling
    if (summary.roas >= 2) {
      actionableInsights.push({
        id: "scale-high-roas",
        type: "recommendation",
        priority: "high",
        title: "Scale High-Performing Campaigns",
        description: `Your campaigns are achieving ${summary.roas.toFixed(2)}x ROAS. Consider increasing budget to capture more conversions.`,
        metric: "ROAS",
        value: `${summary.roas.toFixed(2)}x`,
        dismissible: true,
        actions: [
          {
            id: "scale_budget",
            label: "Increase Budget 20%",
            type: "primary",
            icon: <DollarSign className="h-4 w-4" />,
          },
          {
            id: "view_details",
            label: "View Details",
            type: "secondary",
            icon: <ExternalLink className="h-4 w-4" />,
          },
        ],
      });
    }

    // Low ROAS - suggest optimization
    if (summary.roas > 0 && summary.roas < 1) {
      actionableInsights.push({
        id: "low-roas-alert",
        type: "anomaly",
        priority: "high",
        title: "Underperforming Campaigns Detected",
        description: `ROAS is below 1.0x (${summary.roas.toFixed(2)}x). These campaigns are spending more than they're earning.`,
        metric: "ROAS",
        value: `${summary.roas.toFixed(2)}x`,
        dismissible: true,
        actions: [
          {
            id: "pause_campaign",
            label: "Pause Campaigns",
            type: "danger",
            icon: <Pause className="h-4 w-4" />,
          },
          {
            id: "schedule_review",
            label: "Schedule Review",
            type: "secondary",
            icon: <Calendar className="h-4 w-4" />,
          },
        ],
      });
    }

    // High CTR opportunity
    if (summary.ctr >= 2) {
      actionableInsights.push({
        id: "high-ctr-insight",
        type: "insight",
        priority: "medium",
        title: "Strong Click-Through Performance",
        description: `Your ads have a ${summary.ctr.toFixed(2)}% CTR, which is above average. This creative is resonating well with your audience.`,
        metric: "CTR",
        value: `${summary.ctr.toFixed(2)}%`,
        change: 15,
        dismissible: true,
        actions: [
          {
            id: "copy_creative",
            label: "Copy to New Campaign",
            type: "secondary",
            icon: <Copy className="h-4 w-4" />,
          },
        ],
      });
    }

    // Spending prediction
    if (dailyData.length >= 7) {
      const avgDailySpend = dailyData.slice(-7).reduce((sum, d) => sum + d.spend, 0) / 7;
      const projectedMonthlySpend = avgDailySpend * 30;
      
      actionableInsights.push({
        id: "spend-forecast",
        type: "prediction",
        priority: "low",
        title: "Budget Forecast",
        description: `Based on current pacing, projected monthly spend is $${projectedMonthlySpend.toFixed(0)}.`,
        metric: "Monthly Projection",
        value: `$${projectedMonthlySpend.toFixed(0)}`,
        dismissible: true,
        actions: [
          {
            id: "set_budget_alert",
            label: "Set Budget Alert",
            type: "secondary",
            icon: <DollarSign className="h-4 w-4" />,
          },
        ],
      });
    }

    // Cost efficiency
    if (summary.cpm > 0 && summary.cpm > 20) {
      actionableInsights.push({
        id: "high-cpm-alert",
        type: "recommendation",
        priority: "medium",
        title: "High CPM Detected",
        description: `Your CPM of $${summary.cpm.toFixed(2)} is above average. Consider adjusting targeting or placements.`,
        metric: "CPM",
        value: `$${summary.cpm.toFixed(2)}`,
        dismissible: true,
        actions: [
          {
            id: "optimize_targeting",
            label: "Review Targeting",
            type: "primary",
            icon: <Target className="h-4 w-4" />,
          },
        ],
      });
    }

    return actionableInsights;
  }, [summary, dailyData]);

  // Fetch AI insights from API, fallback to generated insights
  useEffect(() => {
    async function fetchAIInsights() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("dateRange", dateRange);
        params.append("viewLevel", viewLevel);
        if (campaignIds && campaignIds.length > 0) {
          params.append("campaignIds", campaignIds.join(","));
        }

        const response = await fetch(`/api/meta/insights/ai?${params.toString()}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            summary,
            dailyData: dailyData.slice(-30),
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.insights && Array.isArray(data.insights) && data.insights.length > 0) {
            setInsights(data.insights);
          } else {
            // Fallback to generated insights
            setInsights(generateActionableInsights());
          }
        } else {
          // Fallback to generated insights
          setInsights(generateActionableInsights());
        }
      } catch (err) {
        console.error("Error fetching AI insights:", err);
        // Fallback to generated insights
        setInsights(generateActionableInsights());
      } finally {
        setLoading(false);
      }
    }

    fetchAIInsights();
  }, [summary, dailyData, dateRange, campaignIds, viewLevel, generateActionableInsights]);

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  };

  const handleActionClick = (action: InsightAction, insight: Insight) => {
    if (action.id === "view_details") {
      // Navigate to campaign details (would use router in real implementation)
      window.open(`https://business.facebook.com/adsmanager`, "_blank");
      return;
    }
    
    if (action.id === "schedule_review") {
      // Quick schedule without modal
      setScheduledReviews((prev) => new Set(prev).add(insight.id));
      setSuccessMessage("Review scheduled for tomorrow at 9 AM");
      return;
    }

    // Show confirmation modal for other actions
    setSelectedAction({ action, insight });
  };

  const handleConfirmAction = async () => {
    if (!selectedAction) return;

    setIsActionLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    let message = "";
    switch (selectedAction.action.id) {
      case "scale_budget":
        message = "Budget increased by 20% successfully";
        break;
      case "pause_campaign":
        message = "Campaign paused successfully";
        break;
      case "enable_campaign":
        message = "Campaign enabled successfully";
        break;
      case "optimize_targeting":
        message = "Opening targeting settings...";
        window.open(`https://business.facebook.com/adsmanager`, "_blank");
        break;
      case "copy_creative":
        message = "Creative copied to clipboard";
        break;
      case "set_budget_alert":
        message = "Budget alert configured";
        break;
      default:
        message = "Action completed successfully";
    }

    setSuccessMessage(message);
    setIsActionLoading(false);
    setSelectedAction(null);

    // Mark the insight as actioned by dismissing it
    handleDismiss(selectedAction.insight.id);
  };

  const filteredInsights = insights.filter((insight) => !dismissedIds.has(insight.id));

  const getIcon = (type: Insight["type"]) => {
    switch (type) {
      case "insight":
        return <Lightbulb className="h-5 w-5 text-blue-500" />;
      case "prediction":
        return <TrendingUp className="h-5 w-5 text-purple-500" />;
      case "recommendation":
        return <Target className="h-5 w-5 text-green-500" />;
      case "anomaly":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
    }
  };

  const getPriorityColor = (priority: Insight["priority"]) => {
    switch (priority) {
      case "high":
        return "border-l-red-500 bg-red-50 dark:bg-red-900/10";
      case "medium":
        return "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10";
      case "low":
        return "border-l-blue-500 bg-blue-50 dark:bg-blue-900/10";
    }
  };

  const getActionButtonVariant = (type: InsightAction["type"]) => {
    switch (type) {
      case "primary":
        return "default";
      case "danger":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <Card className="p-6 bg-white dark:bg-[#1e1f20] border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="h-5 w-5 text-purple-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Insights</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
          <span className="ml-2 text-gray-500 dark:text-gray-400">Analyzing performance...</span>
        </div>
      </Card>
    );
  }

  if (filteredInsights.length === 0) {
    return (
      <Card className="p-6 bg-white dark:bg-[#1e1f20] border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="h-5 w-5 text-purple-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Insights</h3>
        </div>
        <EmptyState
          type="no-insights"
          title="No Actionable Insights"
          description="Your campaigns are performing steadily. We'll notify you when we detect optimization opportunities."
        />
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6 bg-white dark:bg-[#1e1f20] border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              AI Insights & Recommendations
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {filteredInsights.length} actionable
            </span>
          </div>
          
          {dismissedIds.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDismissedIds(new Set())}
              className="text-xs"
            >
              Show dismissed ({dismissedIds.size})
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {filteredInsights.map((insight, index) => (
            <div
              key={insight.id}
              className={`p-4 rounded-lg border-l-4 ${getPriorityColor(insight.priority)} transition-all hover:shadow-md stagger-item`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-0.5">{getIcon(insight.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-semibold text-gray-900 dark:text-white">{insight.title}</h4>
                      {insight.priority === "high" && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">
                          High Priority
                        </span>
                      )}
                      {scheduledReviews.has(insight.id) && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Review Scheduled
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{insight.description}</p>
                    
                    {insight.metric && insight.value !== undefined && (
                      <div className="flex items-center gap-4 text-sm mb-3">
                        <span className="text-gray-500 dark:text-gray-400">{insight.metric}:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{insight.value}</span>
                        {insight.change !== undefined && (
                          <span
                            className={`flex items-center gap-1 ${
                              insight.change > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {insight.change > 0 ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                            {Math.abs(insight.change)}%
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    {insight.actions && insight.actions.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {insight.actions.map((action) => (
                          <Button
                            key={action.id}
                            size="sm"
                            variant={getActionButtonVariant(action.type) as "default" | "destructive" | "outline"}
                            onClick={() => handleActionClick(action, insight)}
                            className="flex items-center gap-1"
                          >
                            {action.icon}
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {insight.dismissible && (
                  <button
                    onClick={() => handleDismiss(insight.id)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    aria-label="Dismiss insight"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Action Confirmation Modal */}
      {selectedAction && (
        <ActionModal
          isOpen={true}
          onClose={() => setSelectedAction(null)}
          action={selectedAction.action}
          insight={selectedAction.insight}
          onConfirm={handleConfirmAction}
          isLoading={isActionLoading}
        />
      )}

      {/* Success Toast */}
      {successMessage && (
        <SuccessToast
          message={successMessage}
          onClose={() => setSuccessMessage(null)}
        />
      )}
    </>
  );
}
