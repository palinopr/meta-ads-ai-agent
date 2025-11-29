import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { createMetaClient, MetaAdsClient } from "@/lib/meta/client";

// Store for runtime token - used by LangGraph Cloud
let runtimeAccessToken: string | null = null;

/**
 * Set the access token at runtime (called before tool execution)
 */
export function setRuntimeAccessToken(token: string) {
  runtimeAccessToken = token;
}

/**
 * Get client with runtime token or fallback
 */
function getClient(fallbackToken?: string): MetaAdsClient {
  const token = runtimeAccessToken || fallbackToken;
  if (!token) {
    throw new Error("No access token available. Set via setRuntimeAccessToken() or pass directly.");
  }
  return createMetaClient(token);
}

/**
 * Factory function to create Meta Ads tools with a specific access token
 * 25+ tools for full autonomous Meta Ads management
 */
export function createMetaTools(accessToken: string) {
  const client = createMetaClient(accessToken);

  // ============================================
  // ACCOUNT TOOLS
  // ============================================

  const getAdAccounts = tool(
    async () => {
      const { data } = await client.getAdAccounts();
      return JSON.stringify(data, null, 2);
    },
    {
      name: "get_ad_accounts",
      description: "Get all Meta Ad accounts the user has access to. Returns account ID, name, currency, status, spend, and balance.",
      schema: z.object({}),
    }
  );

  const getAdAccount = tool(
    async ({ accountId }) => {
      const data = await client.getAdAccount(accountId);
      return JSON.stringify(data, null, 2);
    },
    {
      name: "get_ad_account",
      description: "Get details of a specific ad account",
      schema: z.object({
        accountId: z.string().describe("The ad account ID (e.g., act_123456789)"),
      }),
    }
  );

  // ============================================
  // CAMPAIGN TOOLS
  // ============================================

  const getCampaigns = tool(
    async ({ accountId }) => {
      const { data } = await client.getCampaigns(accountId);
      return JSON.stringify(data, null, 2);
    },
    {
      name: "get_campaigns",
      description: "Get all campaigns for a specific ad account. Returns campaign ID, name, objective, status, budget, and dates.",
      schema: z.object({
        accountId: z.string().describe("The ad account ID (e.g., act_123456789)"),
      }),
    }
  );

  const getCampaign = tool(
    async ({ campaignId }) => {
      const campaign = await client.getCampaign(campaignId);
      return JSON.stringify(campaign, null, 2);
    },
    {
      name: "get_campaign",
      description: "Get details of a specific campaign",
      schema: z.object({
        campaignId: z.string().describe("The campaign ID"),
      }),
    }
  );

  const createCampaign = tool(
    async ({ accountId, name, objective, status, dailyBudget, bidStrategy }) => {
      const result = await client.createCampaign(accountId, {
        name,
        objective,
        status,
        daily_budget: dailyBudget,
        special_ad_categories: [],
        bid_strategy: bidStrategy,
      });
      return JSON.stringify(result, null, 2);
    },
    {
      name: "create_campaign",
      description: "Create a new campaign. DANGEROUS: Creates a live campaign. Always confirm with user first.",
      schema: z.object({
        accountId: z.string().describe("The ad account ID"),
        name: z.string().describe("Campaign name"),
        objective: z.enum([
          "OUTCOME_AWARENESS",
          "OUTCOME_ENGAGEMENT", 
          "OUTCOME_LEADS",
          "OUTCOME_SALES",
          "OUTCOME_TRAFFIC",
          "OUTCOME_APP_PROMOTION",
        ]).describe("Campaign objective"),
        status: z.enum(["ACTIVE", "PAUSED"]).default("PAUSED").describe("Initial status"),
        dailyBudget: z.number().optional().describe("Daily budget in cents (e.g., 5000 = $50)"),
        bidStrategy: z.enum([
          "LOWEST_COST_WITHOUT_CAP",
          "LOWEST_COST_WITH_BID_CAP",
          "COST_CAP"
        ]).optional().describe("Bid strategy"),
      }),
    }
  );

  const updateCampaign = tool(
    async ({ campaignId, updates }) => {
      const result = await client.updateCampaign(campaignId, updates);
      return JSON.stringify(result, null, 2);
    },
    {
      name: "update_campaign",
      description: "Update a campaign's settings. DANGEROUS: Modifies live campaign. Always confirm with user first.",
      schema: z.object({
        campaignId: z.string().describe("The campaign ID to update"),
        updates: z.object({
          name: z.string().optional().describe("New campaign name"),
          status: z.enum(["ACTIVE", "PAUSED"]).optional().describe("Campaign status"),
          daily_budget: z.number().optional().describe("Daily budget in cents"),
        }).describe("Updates to apply"),
      }),
    }
  );

  const deleteCampaign = tool(
    async ({ campaignId }) => {
      const result = await client.deleteCampaign(campaignId);
      return JSON.stringify(result, null, 2);
    },
    {
      name: "delete_campaign",
      description: "Delete a campaign. DANGEROUS: Permanently deletes campaign. Always confirm with user first.",
      schema: z.object({
        campaignId: z.string().describe("The campaign ID to delete"),
      }),
    }
  );

  // ============================================
  // AD SET TOOLS
  // ============================================

  const getAdSets = tool(
    async ({ campaignId }) => {
      const { data } = await client.getAdSets(campaignId);
      return JSON.stringify(data, null, 2);
    },
    {
      name: "get_ad_sets",
      description: "Get all ad sets for a specific campaign",
      schema: z.object({
        campaignId: z.string().describe("The campaign ID"),
      }),
    }
  );

  const getAdSet = tool(
    async ({ adSetId }) => {
      const data = await client.getAdSet(adSetId);
      return JSON.stringify(data, null, 2);
    },
    {
      name: "get_ad_set",
      description: "Get details of a specific ad set including targeting",
      schema: z.object({
        adSetId: z.string().describe("The ad set ID"),
      }),
    }
  );

  const createAdSet = tool(
    async ({ accountId, name, campaignId, dailyBudget, optimizationGoal, billingEvent, targeting, status }) => {
      const result = await client.createAdSet(accountId, {
        name,
        campaign_id: campaignId,
        daily_budget: dailyBudget,
        optimization_goal: optimizationGoal,
        billing_event: billingEvent,
        targeting,
        status,
      });
      return JSON.stringify(result, null, 2);
    },
    {
      name: "create_ad_set",
      description: "Create a new ad set with targeting. DANGEROUS: Creates live ad set. Always confirm with user first.",
      schema: z.object({
        accountId: z.string().describe("The ad account ID"),
        name: z.string().describe("Ad set name"),
        campaignId: z.string().describe("Parent campaign ID"),
        dailyBudget: z.number().describe("Daily budget in cents"),
        optimizationGoal: z.enum([
          "LINK_CLICKS",
          "LANDING_PAGE_VIEWS",
          "IMPRESSIONS",
          "REACH",
          "CONVERSIONS",
          "LEAD_GENERATION",
          "APP_INSTALLS",
        ]).describe("What to optimize for"),
        billingEvent: z.enum(["IMPRESSIONS", "LINK_CLICKS", "APP_INSTALLS"]).describe("When to charge"),
        targeting: z.object({
          geo_locations: z.object({
            countries: z.array(z.string()).optional(),
          }).optional(),
          age_min: z.number().optional(),
          age_max: z.number().optional(),
          genders: z.array(z.number()).optional().describe("1=male, 2=female"),
        }).describe("Targeting specification"),
        status: z.enum(["ACTIVE", "PAUSED"]).default("PAUSED"),
      }),
    }
  );

  const updateAdSet = tool(
    async ({ adSetId, updates }) => {
      const result = await client.updateAdSet(adSetId, updates);
      return JSON.stringify(result, null, 2);
    },
    {
      name: "update_ad_set",
      description: "Update an ad set. DANGEROUS: Modifies live ad set. Always confirm with user first.",
      schema: z.object({
        adSetId: z.string().describe("The ad set ID"),
        updates: z.object({
          name: z.string().optional(),
          status: z.enum(["ACTIVE", "PAUSED"]).optional(),
          daily_budget: z.number().optional(),
          bid_amount: z.number().optional(),
        }),
      }),
    }
  );

  const deleteAdSet = tool(
    async ({ adSetId }) => {
      const result = await client.deleteAdSet(adSetId);
      return JSON.stringify(result, null, 2);
    },
    {
      name: "delete_ad_set",
      description: "Delete an ad set. DANGEROUS: Permanently deletes. Always confirm with user first.",
      schema: z.object({
        adSetId: z.string().describe("The ad set ID to delete"),
      }),
    }
  );

  // ============================================
  // AD TOOLS
  // ============================================

  const getAds = tool(
    async ({ adSetId }) => {
      const { data } = await client.getAds(adSetId);
      return JSON.stringify(data, null, 2);
    },
    {
      name: "get_ads",
      description: "Get all ads for a specific ad set",
      schema: z.object({
        adSetId: z.string().describe("The ad set ID"),
      }),
    }
  );

  const getAd = tool(
    async ({ adId }) => {
      const data = await client.getAd(adId);
      return JSON.stringify(data, null, 2);
    },
    {
      name: "get_ad",
      description: "Get details of a specific ad including creative",
      schema: z.object({
        adId: z.string().describe("The ad ID"),
      }),
    }
  );

  const updateAd = tool(
    async ({ adId, updates }) => {
      const result = await client.updateAd(adId, updates);
      return JSON.stringify(result, null, 2);
    },
    {
      name: "update_ad",
      description: "Update an ad. DANGEROUS: Modifies live ad. Always confirm with user first.",
      schema: z.object({
        adId: z.string().describe("The ad ID"),
        updates: z.object({
          name: z.string().optional(),
          status: z.enum(["ACTIVE", "PAUSED"]).optional(),
        }),
      }),
    }
  );

  const createAd = tool(
    async ({ accountId, name, adSetId, creativeId, pageId, link, message: adMessage, headline, description, callToAction, status }) => {
      // Build creative spec - either use existing creative or create inline
      let creative: Record<string, unknown>;
      
      if (creativeId) {
        creative = { creative_id: creativeId };
      } else if (pageId && link && adMessage) {
        creative = {
          object_story_spec: {
            page_id: pageId,
            link_data: {
              link,
              message: adMessage,
              ...(headline && { name: headline }),
              ...(description && { description }),
              ...(callToAction && { call_to_action: { type: callToAction, value: { link } } }),
            },
          },
        };
      } else {
        return JSON.stringify({ error: "Must provide either creativeId OR (pageId + link + message)" });
      }

      const result = await client.createAd(accountId, {
        name,
        adset_id: adSetId,
        status: status || "PAUSED",
        creative,
      });
      return JSON.stringify(result, null, 2);
    },
    {
      name: "create_ad",
      description: "Create a new ad. DANGEROUS: Creates live ad. Always confirm with user first. Requires either an existing creative ID or page + link + message to create inline.",
      schema: z.object({
        accountId: z.string().describe("The ad account ID"),
        name: z.string().describe("Ad name"),
        adSetId: z.string().describe("Parent ad set ID"),
        creativeId: z.string().optional().describe("Existing creative ID to use"),
        pageId: z.string().optional().describe("Facebook Page ID (required for inline creative)"),
        link: z.string().optional().describe("Destination URL (required for inline creative)"),
        message: z.string().optional().describe("Primary text / post copy (required for inline creative)"),
        headline: z.string().optional().describe("Ad headline"),
        description: z.string().optional().describe("Ad description"),
        callToAction: z.enum([
          "LEARN_MORE", "SHOP_NOW", "SIGN_UP", "SUBSCRIBE", "CONTACT_US",
          "DOWNLOAD", "GET_OFFER", "GET_QUOTE", "BOOK_NOW", "APPLY_NOW",
        ]).optional().describe("CTA button type"),
        status: z.enum(["ACTIVE", "PAUSED"]).default("PAUSED"),
      }),
    }
  );

  const deleteAd = tool(
    async ({ adId }) => {
      const result = await client.deleteAd(adId);
      return JSON.stringify(result, null, 2);
    },
    {
      name: "delete_ad",
      description: "Delete an ad. DANGEROUS: Permanently deletes. Always confirm with user first.",
      schema: z.object({
        adId: z.string().describe("The ad ID to delete"),
      }),
    }
  );

  // ============================================
  // AUDIENCE TOOLS
  // ============================================

  const getCustomAudiences = tool(
    async ({ accountId }) => {
      const { data } = await client.getCustomAudiences(accountId);
      return JSON.stringify(data, null, 2);
    },
    {
      name: "get_custom_audiences",
      description: "Get all custom audiences for an ad account",
      schema: z.object({
        accountId: z.string().describe("The ad account ID"),
      }),
    }
  );

  const createCustomAudience = tool(
    async ({ accountId, name, subtype, description }) => {
      const result = await client.createCustomAudience(accountId, {
        name,
        subtype,
        description,
      });
      return JSON.stringify(result, null, 2);
    },
    {
      name: "create_custom_audience",
      description: "Create a custom audience. DANGEROUS: Always confirm with user first.",
      schema: z.object({
        accountId: z.string().describe("The ad account ID"),
        name: z.string().describe("Audience name"),
        subtype: z.enum(["CUSTOM", "WEBSITE", "APP", "ENGAGEMENT"]).describe("Audience type"),
        description: z.string().optional(),
      }),
    }
  );

  const createLookalikeAudience = tool(
    async ({ accountId, name, sourceAudienceId, country, ratio }) => {
      const result = await client.createLookalikeAudience(accountId, {
        name,
        origin_audience_id: sourceAudienceId,
        lookalike_spec: {
          country,
          ratio,
          type: "similarity",
        },
      });
      return JSON.stringify(result, null, 2);
    },
    {
      name: "create_lookalike_audience",
      description: "Create a lookalike audience from an existing audience. DANGEROUS: Always confirm first.",
      schema: z.object({
        accountId: z.string().describe("The ad account ID"),
        name: z.string().describe("Lookalike audience name"),
        sourceAudienceId: z.string().describe("Source custom audience ID"),
        country: z.string().describe("Country code (e.g., US)"),
        ratio: z.number().min(0.01).max(0.20).describe("Lookalike size (0.01=1% to 0.20=20%)"),
      }),
    }
  );

  // ============================================
  // TARGETING TOOLS
  // ============================================

  const searchInterests = tool(
    async ({ query }) => {
      const { data } = await client.searchTargetingInterests(query);
      return JSON.stringify(data, null, 2);
    },
    {
      name: "search_interests",
      description: "Search for targeting interests by keyword. Returns interest IDs you can use in ad sets.",
      schema: z.object({
        query: z.string().describe("Interest keyword to search (e.g., 'fitness', 'cooking')"),
      }),
    }
  );

  const searchLocations = tool(
    async ({ query }) => {
      const { data } = await client.searchTargetingLocations(query);
      return JSON.stringify(data, null, 2);
    },
    {
      name: "search_locations",
      description: "Search for geo-targeting locations by name. Returns location keys for targeting.",
      schema: z.object({
        query: z.string().describe("Location name to search (e.g., 'New York', 'California')"),
      }),
    }
  );

  const getReachEstimate = tool(
    async ({ accountId, countries, ageMin, ageMax, genders }) => {
      const targeting = {
        geo_locations: { countries },
        age_min: ageMin,
        age_max: ageMax,
        ...(genders && { genders }),
      };
      const { data } = await client.getTargetingReachEstimate(accountId, targeting);
      return JSON.stringify(data, null, 2);
    },
    {
      name: "get_reach_estimate",
      description: "Estimate audience size for a targeting specification",
      schema: z.object({
        accountId: z.string().describe("The ad account ID"),
        countries: z.array(z.string()).describe("Country codes (e.g., ['US', 'CA'])"),
        ageMin: z.number().min(13).max(65).default(18),
        ageMax: z.number().min(13).max(65).default(65),
        genders: z.array(z.number()).optional().describe("1=male, 2=female, or both"),
      }),
    }
  );

  // ============================================
  // INSIGHTS TOOLS
  // ============================================

  const getAccountInsights = tool(
    async ({ accountId, datePreset, breakdowns }) => {
      const { data } = await client.getAccountInsights(accountId, {
        date_preset: datePreset,
        breakdowns,
      });
      return JSON.stringify(data, null, 2);
    },
    {
      name: "get_account_insights",
      description: "Get performance insights for an ad account. Returns spend, impressions, clicks, CTR, CPC, conversions, ROAS.",
      schema: z.object({
        accountId: z.string().describe("The ad account ID"),
        datePreset: z.enum(["today", "yesterday", "last_7d", "last_14d", "last_30d", "this_month", "last_month"]).default("last_7d"),
        breakdowns: z.array(z.enum(["age", "gender", "country", "placement", "device_platform"])).optional(),
      }),
    }
  );

  const getCampaignInsights = tool(
    async ({ campaignId, datePreset, breakdowns }) => {
      const { data } = await client.getCampaignInsights(campaignId, datePreset, breakdowns);
      return JSON.stringify(data, null, 2);
    },
    {
      name: "get_campaign_insights",
      description: "Get performance insights for a specific campaign",
      schema: z.object({
        campaignId: z.string().describe("The campaign ID"),
        datePreset: z.enum(["today", "yesterday", "last_7d", "last_14d", "last_30d"]).default("last_7d"),
        breakdowns: z.array(z.enum(["age", "gender", "country", "placement"])).optional(),
      }),
    }
  );

  const getAdSetInsights = tool(
    async ({ adSetId, datePreset }) => {
      const { data } = await client.getAdSetInsights(adSetId, datePreset);
      return JSON.stringify(data, null, 2);
    },
    {
      name: "get_ad_set_insights",
      description: "Get performance insights for a specific ad set",
      schema: z.object({
        adSetId: z.string().describe("The ad set ID"),
        datePreset: z.enum(["today", "yesterday", "last_7d", "last_14d", "last_30d"]).default("last_7d"),
      }),
    }
  );

  const getAdInsights = tool(
    async ({ adId, datePreset }) => {
      const { data } = await client.getAdInsights(adId, datePreset);
      return JSON.stringify(data, null, 2);
    },
    {
      name: "get_ad_insights",
      description: "Get performance insights for a specific ad",
      schema: z.object({
        adId: z.string().describe("The ad ID"),
        datePreset: z.enum(["today", "yesterday", "last_7d", "last_14d", "last_30d"]).default("last_7d"),
      }),
    }
  );

  // ============================================
  // ASSET TOOLS
  // ============================================

  const getAdImages = tool(
    async ({ accountId }) => {
      const { data } = await client.getAdImages(accountId);
      return JSON.stringify(data, null, 2);
    },
    {
      name: "get_ad_images",
      description: "Get all uploaded images for an ad account",
      schema: z.object({
        accountId: z.string().describe("The ad account ID"),
      }),
    }
  );

  const getAdVideos = tool(
    async ({ accountId }) => {
      const { data } = await client.getAdVideos(accountId);
      return JSON.stringify(data, null, 2);
    },
    {
      name: "get_ad_videos",
      description: "Get all uploaded videos for an ad account",
      schema: z.object({
        accountId: z.string().describe("The ad account ID"),
      }),
    }
  );

  const getPages = tool(
    async () => {
      const { data } = await client.getPages();
      return JSON.stringify(data, null, 2);
    },
    {
      name: "get_pages",
      description: "Get Facebook Pages the user manages. Needed for creating ads.",
      schema: z.object({}),
    }
  );

  const getPixels = tool(
    async ({ accountId }) => {
      const { data } = await client.getPixels(accountId);
      return JSON.stringify(data, null, 2);
    },
    {
      name: "get_pixels",
      description: "Get Meta Pixels for an ad account. Used for conversion tracking.",
      schema: z.object({
        accountId: z.string().describe("The ad account ID"),
      }),
    }
  );

  // ============================================
  // CATEGORIZE TOOLS
  // ============================================

  // Safe read-only tools
  const readTools = [
    getAdAccounts,
    getAdAccount,
    getCampaigns,
    getCampaign,
    getAdSets,
    getAdSet,
    getAds,
    getAd,
    getCustomAudiences,
    searchInterests,
    searchLocations,
    getReachEstimate,
    getAccountInsights,
    getCampaignInsights,
    getAdSetInsights,
    getAdInsights,
    getAdImages,
    getAdVideos,
    getPages,
    getPixels,
  ];

  // Dangerous write tools (require confirmation)
  const writeTools = [
    createCampaign,
    updateCampaign,
    deleteCampaign,
    createAdSet,
    updateAdSet,
    deleteAdSet,
    createAd,
    updateAd,
    deleteAd,
    createCustomAudience,
    createLookalikeAudience,
  ];

  return {
    readTools,
    writeTools,
    allTools: [...readTools, ...writeTools],
  };
}

/**
 * Create Meta Ads tools for LangGraph Cloud
 * These tools use the runtime access token set via setRuntimeAccessToken()
 */
export function createMetaToolsWithConfig() {
  // Create tools that use the runtime token
  const getAdAccounts = tool(
    async () => {
      const client = getClient();
      const { data } = await client.getAdAccounts();
      return JSON.stringify(data, null, 2);
    },
    {
      name: "get_ad_accounts",
      description: "Get all Meta Ad accounts the user has access to.",
      schema: z.object({}),
    }
  );

  const getCampaigns = tool(
    async ({ accountId }) => {
      const client = getClient();
      // Ensure account ID has the required "act_" prefix for Meta API
      const normalizedAccountId = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
      const { data } = await client.getCampaigns(normalizedAccountId);
      return JSON.stringify(data, null, 2);
    },
    {
      name: "get_campaigns",
      description: "Get all campaigns for a specific ad account.",
      schema: z.object({
        accountId: z.string().describe("The ad account ID (can be with or without 'act_' prefix, e.g., 45558046 or act_45558046)"),
      }),
    }
  );

  const getCampaign = tool(
    async ({ campaignId }) => {
      const client = getClient();
      const campaign = await client.getCampaign(campaignId);
      return JSON.stringify(campaign, null, 2);
    },
    {
      name: "get_campaign",
      description: "Get details of a specific campaign",
      schema: z.object({
        campaignId: z.string().describe("The campaign ID"),
      }),
    }
  );

  const getAdSets = tool(
    async ({ campaignId }) => {
      const client = getClient();
      const { data } = await client.getAdSets(campaignId);
      return JSON.stringify(data, null, 2);
    },
    {
      name: "get_ad_sets",
      description: "Get all ad sets for a specific campaign",
      schema: z.object({
        campaignId: z.string().describe("The campaign ID"),
      }),
    }
  );

  const getAds = tool(
    async ({ adSetId }) => {
      const client = getClient();
      const { data } = await client.getAds(adSetId);
      return JSON.stringify(data, null, 2);
    },
    {
      name: "get_ads",
      description: "Get all ads for a specific ad set",
      schema: z.object({
        adSetId: z.string().describe("The ad set ID"),
      }),
    }
  );

  const getAccountInsights = tool(
    async ({ accountId, datePreset }) => {
      const client = getClient();
      // Ensure account ID has the required "act_" prefix for Meta API
      const normalizedAccountId = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
      const { data } = await client.getAccountInsights(normalizedAccountId, {
        date_preset: datePreset,
      });
      return JSON.stringify(data, null, 2);
    },
    {
      name: "get_account_insights",
      description: "Get performance insights for an ad account.",
      schema: z.object({
        accountId: z.string().describe("The ad account ID (can be with or without 'act_' prefix)"),
        datePreset: z.enum(["today", "yesterday", "last_7d", "last_14d", "last_30d"]).default("last_7d"),
      }),
    }
  );

  const getCampaignInsights = tool(
    async ({ campaignId, datePreset }) => {
      const client = getClient();
      const { data } = await client.getCampaignInsights(campaignId, datePreset);
      return JSON.stringify(data, null, 2);
    },
    {
      name: "get_campaign_insights",
      description: "Get performance insights for a specific campaign",
      schema: z.object({
        campaignId: z.string().describe("The campaign ID"),
        datePreset: z.enum(["today", "yesterday", "last_7d", "last_14d", "last_30d"]).default("last_7d"),
      }),
    }
  );

  // Core tools for most queries
  const allTools = [
    getAdAccounts,
    getCampaigns,
    getCampaign,
    getAdSets,
    getAds,
    getAccountInsights,
    getCampaignInsights,
  ];

  return {
    allTools,
    // Helper to set token at runtime
    getToolsForToken: (token: string) => {
      setRuntimeAccessToken(token);
      return allTools;
    },
  };
}
