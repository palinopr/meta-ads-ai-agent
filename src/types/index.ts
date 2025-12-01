// Global type definitions for Meta Ads AI Agent

/**
 * User profile from Supabase
 */
export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Meta Ads connection (OAuth tokens)
 */
export interface MetaConnection {
  id: string;
  user_id: string;
  access_token: string; // Encrypted
  token_expires_at: string;
  ad_account_id: string;
  ad_account_name: string;
  created_at: string;
  updated_at: string;
}

/**
 * Chat conversation thread
 */
export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

/**
 * Chat message
 */
export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  tool_calls?: ToolCall[];
  created_at: string;
}

/**
 * Tool call from LangGraph agent
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
}

/**
 * Subscription status
 */
export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "canceled"
  | "incomplete"
  | "past_due";

/**
 * User subscription
 */
export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  status: SubscriptionStatus;
  plan: "free" | "pro" | "enterprise";
  current_period_end: string;
  created_at: string;
  updated_at: string;
}

// Meta Ads API Types

/**
 * Meta Ad Account
 */
export interface AdAccount {
  id: string;
  account_id: string;
  name: string;
  currency: string;
  timezone_name: string;
  account_status: number;
  amount_spent: string;
  balance: string;
  business?: {
    id: string;
    name: string;
  };
}

/**
 * Meta Campaign
 */
export interface Campaign {
  id: string;
  account_id?: string;
  name: string;
  objective?: string;
  status: "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED";
  // effective_status shows actual delivery status (can differ from status due to parent, budget, schedule, etc.)
  effective_status?: "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED" | "IN_PROCESS" | "WITH_ISSUES" | "CAMPAIGN_PAUSED" | "ADSET_PAUSED" | "PENDING_REVIEW" | "DISAPPROVED" | "PREAPPROVED" | "PENDING_BILLING_INFO" | "CAMPAIGN_GROUP_PAUSED";
  daily_budget?: string;
  lifetime_budget?: string;
  budget_remaining?: string;
  buying_type?: string;
  special_ad_categories?: string[];
  start_time?: string;
  stop_time?: string;
  created_time?: string;
  updated_time?: string;
  // Insights fields (populated when merged with insights)
  spend?: string;
  impressions?: string;
  clicks?: string;
  cpm?: string;
  cpc?: string;
  ctr?: string;
  reach?: string;
  frequency?: string;
}

/**
 * Meta Ad Set
 */
export interface AdSet {
  id: string;
  campaign_id?: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED";
  daily_budget?: string;
  lifetime_budget?: string;
  budget_remaining?: string;
  targeting?: Record<string, unknown>;
  optimization_goal?: string;
  billing_event?: string;
  bid_amount?: string;
  start_time?: string;
  end_time?: string;
  attribution_spec?: Record<string, unknown>;
  // Insights fields
  spend?: string;
  impressions?: string;
  clicks?: string;
  cpm?: string;
  cpc?: string;
  ctr?: string;
  reach?: string;
}

/**
 * Meta Ad
 */
export interface Ad {
  id: string;
  adset_id?: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED";
  creative?: {
    id: string;
    name?: string;
    body?: string;
    title?: string;
    image_url?: string;
    video_id?: string;
    thumbnail_url?: string;
    call_to_action_type?: string;
    link_url?: string;
  };
  tracking_specs?: Record<string, unknown>[];
  conversion_specs?: Record<string, unknown>[];
  // Insights fields
  spend?: string;
  impressions?: string;
  clicks?: string;
  cpm?: string;
  cpc?: string;
  ctr?: string;
}

/**
 * Meta Ads Insights (performance data)
 */
export interface AdInsights {
  date_start: string;
  date_stop: string;
  impressions: string;
  clicks: string;
  spend: string;
  cpm: string;
  cpc: string;
  ctr: string;
  reach: string;
  frequency: string;
  conversions?: string;
  cost_per_conversion?: string;
  roas?: string;
  // ROAS data from Meta API
  purchase_roas?: Array<{ action_type: string; value: string }>;
  website_purchase_roas?: Array<{ action_type: string; value: string }>;
  // Action data
  actions?: Array<{ action_type: string; value: string }>;
  action_values?: Array<{ action_type: string; value: string }>;
}
