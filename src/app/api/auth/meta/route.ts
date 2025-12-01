import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

/**
 * Initiates Meta/Facebook OAuth login flow
 * Uses traditional OAuth with scope parameter for reliable permission handling
 * 
 * IMPORTANT: Configure your Facebook App at developers.facebook.com:
 * 1. Go to Facebook Login → Settings
 * 2. Enable "Client OAuth Login" and "Web OAuth Login"
 * 3. Add redirect URIs:
 *    - https://meta-ads-ai-palinos-projects.vercel.app/api/auth/meta/callback
 *    - http://localhost:3000/api/auth/meta/callback
 * 4. Under "App Review" → "Permissions and Features", ensure these are approved:
 *    - ads_management
 *    - ads_read
 *    - business_management
 *    - email
 *    - public_profile
 */
export async function GET(request: Request) {
  try {
    const { origin } = new URL(request.url);
    
    const appId = process.env.META_APP_ID;
    if (!appId) {
      return NextResponse.redirect(
        new URL("/login?error=Meta App ID not configured", request.url)
      );
    }
    
    // Generate CSRF state token
    const state = randomBytes(32).toString("hex");
    const redirectUri = `${origin}/api/auth/meta/callback`;
    
    // Traditional OAuth with explicit scope parameter
    // These permissions are needed for Meta Ads management:
    // - ads_management: Create and manage ads
    // - ads_read: Read ads data and insights
    // - business_management: Access Business Manager data
    // - email: Get user's email for account creation
    // - public_profile: Basic profile info (always included)
    const scope = [
      "ads_management",
      "ads_read",
      "business_management",
      "email",
      "public_profile",
    ].join(",");
    
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      state,
      scope,
      response_type: "code",
    });

    const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;

    // Set state cookie for CSRF verification
    const response = NextResponse.redirect(authUrl);
    response.cookies.set("meta_auth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[Meta Auth] Error:", error);
    return NextResponse.redirect(
      new URL("/login?error=Failed to start Meta login", request.url)
    );
  }
}

