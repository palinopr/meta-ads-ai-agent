// Meta Marketing API Configuration

export const META_CONFIG = {
  appId: process.env.META_APP_ID ?? "1349075236218599",
  appSecret: process.env.META_APP_SECRET ?? "",
  apiVersion: process.env.META_API_VERSION ?? "v21.0",
  baseUrl: "https://graph.facebook.com",
  defaultAdAccountId: process.env.META_AD_ACCOUNT_ID ?? "act_787610255314938",
  defaultCampaignId: process.env.DEFAULT_CAMPAIGN_ID ?? "120232002620350525",
  
  // Facebook Login for Business Configuration ID
  configId: "1521845379079629",
  
  // OAuth scopes required for ads management
  scopes: [
    "ads_management",
    "email",
  ],
  
  // OAuth URLs
  oauth: {
    authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    redirectUri: process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/meta/callback`
      : "http://localhost:3000/api/meta/callback",
  },
};

/**
 * Generate Meta OAuth authorization URL
 * Uses Facebook Login for Business with config_id
 */
export function getMetaAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: META_CONFIG.appId,
    redirect_uri: META_CONFIG.oauth.redirectUri,
    config_id: META_CONFIG.configId,
    response_type: "code",
    state,
  });

  return `${META_CONFIG.oauth.authorizeUrl}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
}> {
  const params = new URLSearchParams({
    client_id: META_CONFIG.appId,
    client_secret: META_CONFIG.appSecret,
    redirect_uri: META_CONFIG.oauth.redirectUri,
    code,
  });

  const response = await fetch(
    `${META_CONFIG.oauth.tokenUrl}?${params.toString()}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message ?? "Failed to exchange code for token");
  }

  return response.json();
}

/**
 * Exchange short-lived token for long-lived token (60 days)
 */
export async function getLongLivedToken(shortLivedToken: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
}> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: META_CONFIG.appId,
    client_secret: META_CONFIG.appSecret,
    fb_exchange_token: shortLivedToken,
  });

  const response = await fetch(
    `${META_CONFIG.oauth.tokenUrl}?${params.toString()}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message ?? "Failed to get long-lived token");
  }

  return response.json();
}

