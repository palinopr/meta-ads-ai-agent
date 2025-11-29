import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createMetaClient } from "@/lib/meta/client";

interface FacebookTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface FacebookUserInfo {
  id: string;
  email?: string;
  name?: string;
  picture?: {
    data: {
      url: string;
    };
  };
}

interface LongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Create a Supabase client for Route Handlers that can set cookies on the response
 */
function createRouteHandlerClient(
  request: NextRequest,
  response: NextResponse
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}

/**
 * Exchange short-lived token for long-lived token (60 days)
 */
async function getLongLivedToken(shortLivedToken: string, appId: string, appSecret: string): Promise<LongLivedTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });

  const response = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?${params.toString()}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message ?? "Failed to get long-lived token");
  }

  return response.json();
}

/**
 * Store Meta Ads connection for a user
 */
async function storeMetaConnection(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  accessToken: string,
  expiresIn: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get user's ad accounts using the token
    const metaClient = createMetaClient(accessToken);
    let adAccounts;
    
    try {
      const result = await metaClient.getAdAccounts();
      adAccounts = result.data;
    } catch (fetchError) {
      console.log("[Meta Callback] Could not fetch ad accounts:", fetchError);
      // Not a critical error - user might not have ad accounts yet
      return { success: true };
    }

    if (!adAccounts || adAccounts.length === 0) {
      console.log("[Meta Callback] No ad accounts found");
      // Not a critical error - user might not have ad accounts yet
      return { success: true };
    }

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Store the primary ad account connection
    const primaryAccount = adAccounts[0];
    
    if (!primaryAccount) {
      console.log("[Meta Callback] Primary account is undefined");
      return { success: true };
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: dbError } = await (supabase as any).from("meta_connections").upsert(
      {
        user_id: userId,
        access_token: accessToken,
        token_expires_at: expiresAt,
        ad_account_id: primaryAccount.account_id,
        ad_account_name: primaryAccount.name,
      },
      {
        onConflict: "user_id,ad_account_id",
      }
    );

    if (dbError) {
      console.error("[Meta Callback] DB error storing connection:", dbError);
      return { success: false, error: dbError.message };
    }

    console.log("[Meta Callback] Meta connection stored for account:", primaryAccount.name);
    return { success: true };
  } catch (error) {
    console.error("[Meta Callback] Error storing Meta connection:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Handles Meta/Facebook OAuth callback
 * Exchanges code for token, gets user info, and creates/signs in Supabase user
 */
export async function GET(request: NextRequest) {
  console.log("[Meta Callback] Starting callback handler...");
  
  try {
    const { origin } = new URL(request.url);
    console.log("[Meta Callback] Origin:", origin);
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Handle OAuth errors from Facebook
    if (error) {
      console.error("Facebook OAuth error:", error, errorDescription);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(errorDescription || error)}`, origin)
      );
    }

    // Verify CSRF state
    const storedState = request.cookies.get("meta_auth_state")?.value;
    if (!state || state !== storedState) {
      return NextResponse.redirect(
        new URL("/login?error=Invalid authentication state", origin)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/login?error=Missing authorization code", origin)
      );
    }

    // Validate required environment variables
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    
    if (!appId || !appSecret) {
      console.error("Missing META_APP_ID or META_APP_SECRET environment variables");
      return NextResponse.redirect(
        new URL("/login?error=Server configuration error", origin)
      );
    }

    // Exchange code for access token using POST (security best practice)
    // Sending client_secret in request body, not URL, to prevent logging/leakage
    const tokenUrl = "https://graph.facebook.com/v21.0/oauth/access_token";
    const tokenBody = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: `${origin}/api/auth/meta/callback`,
      code,
    });

    console.log("[Meta Callback] Exchanging code for token...");
    
    let tokenResponse: Response;
    try {
      tokenResponse = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: tokenBody.toString(),
      });
    } catch (fetchError) {
      console.error("[Meta Callback] Token fetch error:", fetchError);
      const errMsg = fetchError instanceof Error ? fetchError.message : "Token exchange failed";
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(`Token fetch: ${errMsg}`)}`, origin)
      );
    }

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.json();
      console.error("Token exchange error:", JSON.stringify(tokenError, null, 2));
      console.error("Token exchange params (excluding secret):", {
        client_id: appId,
        redirect_uri: `${origin}/api/auth/meta/callback`,
        code: code.substring(0, 20) + "...",
      });
      const errorMsg = tokenError?.error?.message || tokenError?.error_description || "Failed to authenticate with Meta";
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(errorMsg)}`, origin)
      );
    }

    const tokenData: FacebookTokenResponse = await tokenResponse.json();

    // Exchange for long-lived token (60 days) for ads access
    console.log("[Meta Callback] Exchanging for long-lived token...");
    let longLivedToken: LongLivedTokenResponse;
    try {
      longLivedToken = await getLongLivedToken(tokenData.access_token, appId, appSecret);
      console.log("[Meta Callback] Got long-lived token, expires in:", longLivedToken.expires_in, "seconds");
    } catch (tokenError) {
      console.error("[Meta Callback] Long-lived token error:", tokenError);
      // Continue with short-lived token - not critical for auth
      longLivedToken = tokenData;
    }

    // Get user info from Facebook
    const userInfoParams = new URLSearchParams({
      fields: "id,email,name,picture",
      access_token: tokenData.access_token,
    });

    console.log("[Meta Callback] Fetching user info...");
    let userInfoResponse: Response;
    try {
      userInfoResponse = await fetch(
        `https://graph.facebook.com/v21.0/me?${userInfoParams.toString()}`
      );
    } catch (fetchError) {
      console.error("[Meta Callback] User info fetch error:", fetchError);
      const errMsg = fetchError instanceof Error ? fetchError.message : "User info fetch failed";
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(`User info fetch: ${errMsg}`)}`, origin)
      );
    }

    if (!userInfoResponse.ok) {
      const userError = await userInfoResponse.json();
      console.error("User info error:", userError);
      return NextResponse.redirect(
        new URL("/login?error=Failed to get user info", origin)
      );
    }

    const fbUser: FacebookUserInfo = await userInfoResponse.json();
    console.log("[Meta Callback] Got user:", fbUser.email || fbUser.id);

    // Validate Supabase env vars
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("[Meta Callback] Missing Supabase env vars");
      return NextResponse.redirect(
        new URL("/login?error=Server configuration error (Supabase)", origin)
      );
    }
    
    console.log("[Meta Callback] Supabase URL:", supabaseUrl);

    // Use Facebook ID as a unique identifier
    // We'll create a user with email or generate one from Facebook ID
    const email = fbUser.email || `fb_${fbUser.id}@meta-ads-ai.local`;
    
    // Generate secure password using validated appSecret
    const oauthPassword = `meta_oauth_${fbUser.id}_${appSecret.slice(0, 8)}`;
    
    // Create response object that will have cookies set on it
    const response = NextResponse.redirect(new URL("/dashboard", origin));
    response.cookies.delete("meta_auth_state");
    
    // Create Supabase client that sets cookies on response
    const supabase = createRouteHandlerClient(request, response);
    
    // Try to sign in first (if user exists)
    console.log("[Meta Callback] Attempting sign in for:", email);
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: oauthPassword,
    });

    if (signInData?.session) {
      // User exists and signed in successfully - cookies already set by SSR client
      console.log("[Meta Callback] Sign in successful!");
      
      // Store/update Meta Ads connection with long-lived token
      await storeMetaConnection(supabase, signInData.session.user.id, longLivedToken.access_token, longLivedToken.expires_in);
      
      return response;
    }

    // If sign in failed, try to create new account
    if (signInError) {
      console.log("[Meta Callback] Sign in error (will try signup):", signInError.message);
    }

    // User doesn't exist, create new account
    console.log("[Meta Callback] Attempting sign up for:", email);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password: oauthPassword,
      options: {
        data: {
          full_name: fbUser.name,
          avatar_url: fbUser.picture?.data?.url,
          facebook_id: fbUser.id,
          provider: "facebook",
        },
      },
    });

    if (signUpError) {
      console.error("[Meta Callback] Sign up error:", signUpError);
      
      // Check if user exists with different auth method
      if (signUpError.message?.includes("already registered")) {
        return NextResponse.redirect(
          new URL("/login?error=Email already registered. Please sign in with your password.", origin)
        );
      }
      
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(signUpError.message)}`, origin)
      );
    }

    // If we got a session from signup (email confirmation disabled), cookies already set
    if (signUpData?.session) {
      console.log("[Meta Callback] Sign up successful with session!");
      
      // Store Meta Ads connection with long-lived token
      await storeMetaConnection(supabase, signUpData.session.user.id, longLivedToken.access_token, longLivedToken.expires_in);
      
      return response;
    }

    // If no session but user created, try to sign in
    if (signUpData?.user) {
      console.log("[Meta Callback] User created, attempting auto sign-in...");
      const { data: autoSignInData, error: autoSignInError } = await supabase.auth.signInWithPassword({
        email,
        password: oauthPassword,
      });

      if (autoSignInData?.session) {
        console.log("[Meta Callback] Auto sign-in successful!");
        
        // Store Meta Ads connection with long-lived token
        await storeMetaConnection(supabase, autoSignInData.session.user.id, longLivedToken.access_token, longLivedToken.expires_in);
        
        return response;
      }

      if (autoSignInError) {
        console.error("[Meta Callback] Auto sign-in error:", autoSignInError.message);
        // Check if it's email confirmation required
        if (autoSignInError.message?.includes("Email not confirmed")) {
          return NextResponse.redirect(
            new URL("/login?message=Please check your email to confirm your account", origin)
          );
        }
      }
    }

    // Fallback - something went wrong
    console.error("[Meta Callback] No session obtained after signup");
    return NextResponse.redirect(
      new URL("/login?error=Failed to create session", origin)
    );
  } catch (error) {
    console.error("[Meta Callback] FINAL CATCH - Error:", error);
    console.error("[Meta Callback] Error type:", typeof error);
    console.error("[Meta Callback] Error constructor:", error?.constructor?.name);
    if (error instanceof Error) {
      console.error("[Meta Callback] Error message:", error.message);
      console.error("[Meta Callback] Error stack:", error.stack);
    }
    const errorMessage = error instanceof Error ? error.message : "Authentication failed";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorMessage)}`, new URL(request.url).origin)
    );
  }
}

