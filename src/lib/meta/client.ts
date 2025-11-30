import { META_CONFIG } from "./config";
import type { AdAccount, Campaign, AdSet, Ad, AdInsights } from "@/types";

/**
 * Meta Marketing API Client
 * Full SDK for autonomous Meta Ads management
 */
export class MetaAdsClient {
  private accessToken: string;
  private baseUrl: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
    this.baseUrl = `${META_CONFIG.baseUrl}/${META_CONFIG.apiVersion}`;
  }

  /**
   * Make authenticated request to Meta API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.set("access_token", this.accessToken);

    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      const response = await fetch(url.toString(), {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error?.message ?? `Meta API error: ${response.status}`
        );
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Meta API request timed out after 15 seconds');
      }
      throw error;
    }
  }

  // ============================================
  // USER & ACCOUNTS
  // ============================================

  async getMe(): Promise<{ id: string; name: string }> {
    return this.request("/me?fields=id,name");
  }

  async getAdAccounts(): Promise<{ data: AdAccount[] }> {
    return this.request(
      "/me/adaccounts?fields=id,account_id,name,currency,timezone_name,account_status,amount_spent,balance,spend_cap,min_daily_budget,business"
    );
  }

  async getAdAccount(accountId: string): Promise<AdAccount> {
    return this.request(
      `/${accountId}?fields=id,account_id,name,currency,timezone_name,account_status,amount_spent,balance,spend_cap,min_daily_budget,business`
    );
  }

  // ============================================
  // CAMPAIGNS - Full CRUD
  // ============================================

  async getCampaigns(accountId: string): Promise<{ data: Campaign[] }> {
    return this.request(
      `/${accountId}/campaigns?fields=id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time,budget_remaining,buying_type,special_ad_categories&limit=100`
    );
  }

  async getCampaign(campaignId: string): Promise<Campaign> {
    return this.request(
      `/${campaignId}?fields=id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time,budget_remaining,buying_type,special_ad_categories`
    );
  }

  async createCampaign(
    accountId: string,
    data: {
      name: string;
      objective: string;
      status?: "ACTIVE" | "PAUSED";
      daily_budget?: number;
      lifetime_budget?: number;
      special_ad_categories?: string[];
      buying_type?: "AUCTION" | "RESERVED";
      bid_strategy?: "LOWEST_COST_WITHOUT_CAP" | "LOWEST_COST_WITH_BID_CAP" | "COST_CAP";
    }
  ): Promise<{ id: string }> {
    const params = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        params.set(key, Array.isArray(value) ? JSON.stringify(value) : String(value));
      }
    });

    return this.request(`/${accountId}/campaigns?${params.toString()}`, {
      method: "POST",
    });
  }

  async updateCampaign(
    campaignId: string,
    data: Partial<{
      name: string;
      status: "ACTIVE" | "PAUSED" | "DELETED";
      daily_budget: number;
      lifetime_budget: number;
      bid_strategy: string;
    }>
  ): Promise<{ success: boolean }> {
    const params = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        params.set(key, String(value));
      }
    });

    return this.request(`/${campaignId}?${params.toString()}`, {
      method: "POST",
    });
  }

  async deleteCampaign(campaignId: string): Promise<{ success: boolean }> {
    return this.request(`/${campaignId}`, { method: "DELETE" });
  }

  // ============================================
  // AD SETS - Full CRUD
  // ============================================

  async getAdSets(campaignId: string): Promise<{ data: AdSet[] }> {
    return this.request(
      `/${campaignId}/adsets?fields=id,name,status,daily_budget,lifetime_budget,targeting,optimization_goal,billing_event,bid_amount,start_time,end_time,budget_remaining,attribution_spec&limit=100`
    );
  }

  async getAdSet(adSetId: string): Promise<AdSet> {
    return this.request(
      `/${adSetId}?fields=id,name,status,daily_budget,lifetime_budget,targeting,optimization_goal,billing_event,bid_amount,start_time,end_time,budget_remaining,attribution_spec`
    );
  }

  async createAdSet(
    accountId: string,
    data: {
      name: string;
      campaign_id: string;
      status?: "ACTIVE" | "PAUSED";
      daily_budget?: number;
      lifetime_budget?: number;
      optimization_goal: string;
      billing_event: string;
      bid_amount?: number;
      targeting: {
        geo_locations?: { countries?: string[]; cities?: Array<{ key: string }> };
        age_min?: number;
        age_max?: number;
        genders?: number[];
        interests?: Array<{ id: string; name: string }>;
        behaviors?: Array<{ id: string; name: string }>;
        custom_audiences?: Array<{ id: string }>;
        excluded_custom_audiences?: Array<{ id: string }>;
        publisher_platforms?: string[];
        facebook_positions?: string[];
        instagram_positions?: string[];
      };
      start_time?: string;
      end_time?: string;
    }
  ): Promise<{ id: string }> {
    const body = JSON.stringify(data);
    return this.request(`/${accountId}/adsets`, {
      method: "POST",
      body,
    });
  }

  async updateAdSet(
    adSetId: string,
    data: Partial<{
      name: string;
      status: "ACTIVE" | "PAUSED" | "DELETED";
      daily_budget: number;
      lifetime_budget: number;
      bid_amount: number;
      targeting: Record<string, unknown>;
      start_time: string;
      end_time: string;
    }>
  ): Promise<{ success: boolean }> {
    const params = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        params.set(key, typeof value === "object" ? JSON.stringify(value) : String(value));
      }
    });

    return this.request(`/${adSetId}?${params.toString()}`, {
      method: "POST",
    });
  }

  async deleteAdSet(adSetId: string): Promise<{ success: boolean }> {
    return this.request(`/${adSetId}`, { method: "DELETE" });
  }

  // ============================================
  // ADS - Full CRUD
  // ============================================

  async getAds(adSetId: string): Promise<{ data: Ad[] }> {
    return this.request(
      `/${adSetId}/ads?fields=id,name,status,creative{id,name,body,title,image_url,video_id,call_to_action_type,link_url},tracking_specs,conversion_specs&limit=100`
    );
  }

  async getAd(adId: string): Promise<Ad> {
    return this.request(
      `/${adId}?fields=id,name,status,creative{id,name,body,title,image_url,video_id,call_to_action_type,link_url},tracking_specs,conversion_specs`
    );
  }

  async createAd(
    accountId: string,
    data: {
      name: string;
      adset_id: string;
      status?: "ACTIVE" | "PAUSED";
      creative: {
        creative_id?: string;
        // Or inline creative
        name?: string;
        object_story_spec?: {
          page_id: string;
          link_data?: {
            link: string;
            message: string;
            name?: string;
            description?: string;
            image_hash?: string;
            call_to_action?: { type: string; value?: { link: string } };
          };
          video_data?: {
            video_id: string;
            message: string;
            title?: string;
            call_to_action?: { type: string; value?: { link: string } };
          };
        };
      };
      tracking_specs?: Array<{ action_type: string[]; fb_pixel: string[] }>;
    }
  ): Promise<{ id: string }> {
    const body = JSON.stringify(data);
    return this.request(`/${accountId}/ads`, {
      method: "POST",
      body,
    });
  }

  async updateAd(
    adId: string,
    data: Partial<{
      name: string;
      status: "ACTIVE" | "PAUSED" | "DELETED";
      creative: Record<string, unknown>;
    }>
  ): Promise<{ success: boolean }> {
    const params = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        params.set(key, typeof value === "object" ? JSON.stringify(value) : String(value));
      }
    });

    return this.request(`/${adId}?${params.toString()}`, {
      method: "POST",
    });
  }

  async deleteAd(adId: string): Promise<{ success: boolean }> {
    return this.request(`/${adId}`, { method: "DELETE" });
  }

  // ============================================
  // AD CREATIVES
  // ============================================

  async getAdCreatives(accountId: string): Promise<{ data: Array<{ id: string; name: string; body: string; title: string }> }> {
    return this.request(
      `/${accountId}/adcreatives?fields=id,name,body,title,image_url,video_id,call_to_action_type,object_story_spec&limit=100`
    );
  }

  async createAdCreative(
    accountId: string,
    data: {
      name: string;
      object_story_spec: {
        page_id: string;
        link_data?: {
          link: string;
          message: string;
          name?: string;
          description?: string;
          image_hash?: string;
          call_to_action?: { type: string; value?: { link: string } };
        };
        video_data?: {
          video_id: string;
          message: string;
          title?: string;
          call_to_action?: { type: string; value?: { link: string } };
        };
      };
    }
  ): Promise<{ id: string }> {
    const body = JSON.stringify(data);
    return this.request(`/${accountId}/adcreatives`, {
      method: "POST",
      body,
    });
  }

  // ============================================
  // AUDIENCES
  // ============================================

  async getCustomAudiences(accountId: string): Promise<{ data: Array<{ id: string; name: string; subtype: string; approximate_count: number }> }> {
    return this.request(
      `/${accountId}/customaudiences?fields=id,name,subtype,approximate_count,description,data_source&limit=100`
    );
  }

  async createCustomAudience(
    accountId: string,
    data: {
      name: string;
      subtype: "CUSTOM" | "WEBSITE" | "APP" | "OFFLINE_CONVERSION" | "ENGAGEMENT";
      description?: string;
      customer_file_source?: "USER_PROVIDED_ONLY" | "PARTNER_PROVIDED_ONLY" | "BOTH_USER_AND_PARTNER_PROVIDED";
      rule?: Record<string, unknown>; // For website/app audiences
    }
  ): Promise<{ id: string }> {
    const body = JSON.stringify(data);
    return this.request(`/${accountId}/customaudiences`, {
      method: "POST",
      body,
    });
  }

  async createLookalikeAudience(
    accountId: string,
    data: {
      name: string;
      origin_audience_id: string;
      lookalike_spec: {
        country: string;
        ratio: number; // 0.01 to 0.20 (1% to 20%)
        type: "similarity" | "reach";
      };
    }
  ): Promise<{ id: string }> {
    const body = JSON.stringify({
      name: data.name,
      subtype: "LOOKALIKE",
      origin_audience_id: data.origin_audience_id,
      lookalike_spec: JSON.stringify(data.lookalike_spec),
    });
    return this.request(`/${accountId}/customaudiences`, {
      method: "POST",
      body,
    });
  }

  async deleteCustomAudience(audienceId: string): Promise<{ success: boolean }> {
    return this.request(`/${audienceId}`, { method: "DELETE" });
  }

  // ============================================
  // TARGETING SEARCH
  // ============================================

  async searchTargetingInterests(query: string): Promise<{ data: Array<{ id: string; name: string; audience_size: number; path: string[] }> }> {
    return this.request(
      `/search?type=adinterest&q=${encodeURIComponent(query)}&limit=50`
    );
  }

  async searchTargetingBehaviors(query: string): Promise<{ data: Array<{ id: string; name: string; audience_size: number }> }> {
    return this.request(
      `/search?type=adTargetingCategory&class=behaviors&q=${encodeURIComponent(query)}&limit=50`
    );
  }

  async searchTargetingLocations(query: string): Promise<{ data: Array<{ key: string; name: string; type: string; country_code: string }> }> {
    return this.request(
      `/search?type=adgeolocation&q=${encodeURIComponent(query)}&limit=50`
    );
  }

  async getTargetingReachEstimate(
    accountId: string,
    targeting: Record<string, unknown>
  ): Promise<{ data: { users_lower_bound: number; users_upper_bound: number } }> {
    const params = new URLSearchParams({
      targeting_spec: JSON.stringify(targeting),
    });
    return this.request(`/${accountId}/reachestimate?${params.toString()}`);
  }

  // ============================================
  // INSIGHTS & ANALYTICS
  // ============================================

  async getAccountInsights(
    accountId: string,
    options: {
      date_preset?: string;
      time_range?: { since: string; until: string };
      level?: "account" | "campaign" | "adset" | "ad";
      breakdowns?: string[];
    } = {}
  ): Promise<{ data: AdInsights[] }> {
    const params = new URLSearchParams({
      fields: "date_start,date_stop,impressions,clicks,spend,cpm,cpc,ctr,reach,frequency,conversions,cost_per_conversion,actions,action_values,purchase_roas,website_purchase_roas",
      ...(options.date_preset && { date_preset: options.date_preset }),
      ...(options.time_range && { time_range: JSON.stringify(options.time_range) }),
      ...(options.level && { level: options.level }),
      ...(options.breakdowns && { breakdowns: options.breakdowns.join(",") }),
    });

    return this.request(`/${accountId}/insights?${params.toString()}`);
  }

  async getCampaignInsights(
    campaignId: string,
    datePreset: string = "last_7d",
    breakdowns?: string[]
  ): Promise<{ data: AdInsights[] }> {
    const params = new URLSearchParams({
      fields: "date_start,date_stop,impressions,clicks,spend,cpm,cpc,ctr,reach,frequency,conversions,cost_per_conversion,actions,action_values,purchase_roas",
      date_preset: datePreset,
      ...(breakdowns && { breakdowns: breakdowns.join(",") }),
    });
    return this.request(`/${campaignId}/insights?${params.toString()}`);
  }

  async getAdSetInsights(
    adSetId: string,
    datePreset: string = "last_7d"
  ): Promise<{ data: AdInsights[] }> {
    return this.request(
      `/${adSetId}/insights?fields=date_start,date_stop,impressions,clicks,spend,cpm,cpc,ctr,reach,frequency,conversions,cost_per_conversion,actions&date_preset=${datePreset}`
    );
  }

  async getAdInsights(
    adId: string,
    datePreset: string = "last_7d"
  ): Promise<{ data: AdInsights[] }> {
    return this.request(
      `/${adId}/insights?fields=date_start,date_stop,impressions,clicks,spend,cpm,cpc,ctr,reach,frequency,conversions,cost_per_conversion,actions&date_preset=${datePreset}`
    );
  }

  // ============================================
  // IMAGES & VIDEOS
  // ============================================

  async getAdImages(accountId: string): Promise<{ data: Array<{ hash: string; name: string; url: string }> }> {
    return this.request(`/${accountId}/adimages?fields=hash,name,url,width,height&limit=100`);
  }

  async getAdVideos(accountId: string): Promise<{ data: Array<{ id: string; title: string; source: string }> }> {
    return this.request(`/${accountId}/advideos?fields=id,title,source,thumbnails,length&limit=100`);
  }

  // ============================================
  // PIXELS
  // ============================================

  async getPixels(accountId: string): Promise<{ data: Array<{ id: string; name: string; code: string }> }> {
    return this.request(`/${accountId}/adspixels?fields=id,name,code,last_fired_time`);
  }

  async getPixelStats(pixelId: string): Promise<{ data: { event: string; count: number; value: number }[] }> {
    return this.request(`/${pixelId}/stats?aggregation=event`);
  }

  // ============================================
  // PAGES (for ad creation)
  // ============================================

  async getPages(): Promise<{ data: Array<{ id: string; name: string; access_token: string }> }> {
    return this.request("/me/accounts?fields=id,name,access_token");
  }
}

/**
 * Create a new Meta Ads client with the given access token
 */
export function createMetaClient(accessToken: string): MetaAdsClient {
  return new MetaAdsClient(accessToken);
}
