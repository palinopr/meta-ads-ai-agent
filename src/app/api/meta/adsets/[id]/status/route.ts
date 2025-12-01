import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const META_API_VERSION = process.env.META_API_VERSION || "v21.0";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const accessToken = request.headers.get("x-access-token");
    
    if (!accessToken) {
      return NextResponse.json({ error: "No access token" }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body;
    
    if (!status || !["ACTIVE", "PAUSED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Update ad set status via Meta API
    const response = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/${id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          access_token: accessToken,
          status: status,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Meta API error:", error);
      return NextResponse.json(
        { error: error.error?.message || "Failed to update ad set status" },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Error updating ad set status:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update status" },
      { status: 500 }
    );
  }
}

