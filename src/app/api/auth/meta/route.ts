import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

/**
 * Initiates Meta/Facebook OAuth login flow
 * This bypasses Supabase's OAuth and uses direct Facebook Login
 * 
 * IMPORTANT: Configure your Facebook App at developers.facebook.com:
 * 1. Go to Facebook Login → Settings
 * 2. Enable "Client OAuth Login" and "Web OAuth Login"
 * 3. Add redirect URI: http://localhost:3000/api/auth/meta/callback
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
    
    // Facebook Login for Business OAuth params (uses config_id instead of scope)
    const configId = "1521845379079629"; // Meta Ads AI configuration
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      state,
      config_id: configId,
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

