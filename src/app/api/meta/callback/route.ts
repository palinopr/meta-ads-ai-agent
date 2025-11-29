import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForToken, getLongLivedToken } from "@/lib/meta/config";
import { createMetaClient } from "@/lib/meta/client";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle OAuth errors
    if (error) {
      console.error("Meta OAuth error:", error);
      return NextResponse.redirect(
        new URL("/dashboard?error=meta_auth_failed", request.url)
      );
    }

    // Verify state parameter
    const storedState = request.cookies.get("meta_oauth_state")?.value;
    if (!state || state !== storedState) {
      return NextResponse.redirect(
        new URL("/dashboard?error=invalid_state", request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/dashboard?error=missing_code", request.url)
      );
    }

    // Check if user is authenticated
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Exchange code for short-lived token
    const shortLivedToken = await exchangeCodeForToken(code);

    // Exchange for long-lived token (60 days)
    const longLivedToken = await getLongLivedToken(shortLivedToken.access_token);

    // Get user's ad accounts using the token
    const metaClient = createMetaClient(longLivedToken.access_token);
    const { data: adAccounts } = await metaClient.getAdAccounts();

    if (!adAccounts || adAccounts.length === 0) {
      return NextResponse.redirect(
        new URL("/dashboard?error=no_ad_accounts", request.url)
      );
    }

    // Calculate token expiry
    const expiresAt = new Date(
      Date.now() + longLivedToken.expires_in * 1000
    ).toISOString();

    // Store the connection(s) in database
    // For now, we'll store the first ad account
    const primaryAccount = adAccounts[0];
    
    if (!primaryAccount) {
      return NextResponse.redirect(
        new URL("/dashboard?error=no_ad_accounts", request.url)
      );
    }

    const { error: dbError } = await supabase.from("meta_connections").upsert(
      {
        user_id: user.id,
        access_token: longLivedToken.access_token, // Should be encrypted in production
        token_expires_at: expiresAt,
        ad_account_id: primaryAccount.account_id,
        ad_account_name: primaryAccount.name,
      },
      {
        onConflict: "user_id,ad_account_id",
      }
    );

    if (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.redirect(
        new URL("/dashboard?error=db_error", request.url)
      );
    }

    // Clear the state cookie and redirect to dashboard
    const response = NextResponse.redirect(
      new URL("/dashboard?success=meta_connected", request.url)
    );
    response.cookies.delete("meta_oauth_state");

    return response;
  } catch (error) {
    console.error("Meta callback error:", error);
    return NextResponse.redirect(
      new URL("/dashboard?error=callback_failed", request.url)
    );
  }
}

