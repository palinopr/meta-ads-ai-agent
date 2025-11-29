import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMetaAuthUrl } from "@/lib/meta/config";
import { randomBytes } from "crypto";

export async function GET() {
  try {
    // Check if user is authenticated
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate a random state for CSRF protection
    const state = randomBytes(32).toString("hex");

    // Store state in a cookie for verification on callback
    const authUrl = getMetaAuthUrl(state);

    const response = NextResponse.redirect(authUrl);
    response.cookies.set("meta_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes
    });

    return response;
  } catch (error) {
    console.error("Meta connect error:", error);
    return NextResponse.json(
      { error: "Failed to initiate Meta connection" },
      { status: 500 }
    );
  }
}

