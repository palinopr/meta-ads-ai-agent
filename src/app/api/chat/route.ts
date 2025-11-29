import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Client } from "@langchain/langgraph-sdk";

// LangGraph Cloud configuration
const LANGGRAPH_URL = process.env.LANGGRAPH_DEPLOYMENT_URL || "https://outletmediabot-ab9fc8ce6a205b55b93d7a68eed19ece.us.langgraph.app";
const LANGGRAPH_API_KEY = process.env.LANGGRAPH_API_KEY;
const GRAPH_NAME = "meta_ads_agent";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, conversationId } = await request.json();

    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    // Get Meta connection
    const { data: connection } = await supabase
      .from("meta_connections")
      .select("access_token, ad_account_id, token_expires_at")
      .eq("user_id", user.id)
      .single();

    if (!connection) {
      return NextResponse.json({ error: "No Meta connection found" }, { status: 400 });
    }

    if (new Date(connection.token_expires_at) < new Date()) {
      return NextResponse.json({ error: "Token expired" }, { status: 400 });
    }

    // Get or create conversation (used as thread_id for LangGraph)
    let threadId = conversationId;
    if (!threadId) {
      const { data: conv } = await supabase
        .from("conversations")
        .insert({ user_id: user.id, title: message.slice(0, 50) })
        .select("id")
        .single();
      threadId = conv?.id;
    }

    // Save user message
    await supabase.from("messages").insert({
      conversation_id: threadId,
      role: "user",
      content: message,
    });

    // Quick responses for simple greetings (avoid calling LangGraph Cloud)
    const lowerMessage = message.toLowerCase().trim();
    const quickResponses: Record<string, string> = {
      "hello": "Hey! 👋 How can I help with your ads today?",
      "hi": "Hi there! 👋 What would you like to know about your ads?",
      "hey": "Hey! 👋 Ready to help with your Facebook/Instagram ads!",
      "help": "I can help you with:\n• Check how your ads are doing\n• See your spending and results\n• Create or edit campaigns\n\nJust ask me anything!",
    };

    if (quickResponses[lowerMessage]) {
      await supabase.from("messages").insert({
        conversation_id: threadId,
        role: "assistant",
        content: quickResponses[lowerMessage],
      });
      const encoder = new TextEncoder();
      const quickStream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "conversationId", value: threadId })}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", value: quickResponses[lowerMessage] })}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", value: "" })}\n\n`));
          controller.close();
        },
      });
      return new Response(quickStream, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
      });
    }

    // Create LangGraph Cloud client
    console.log("[Chat API] Connecting to LangGraph Cloud:", LANGGRAPH_URL);
    const client = new Client({
      apiUrl: LANGGRAPH_URL,
      apiKey: LANGGRAPH_API_KEY,
    });

    // Create SSE stream to client
    const encoder = new TextEncoder();
    let fullResponse = "";

    const stream = new ReadableStream({
      async start(controller) {
        const send = (type: string, value: string) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, value })}\n\n`));
        };

        try {
          send("conversationId", threadId);
          console.log("[Chat API] Calling LangGraph Cloud with message:", message.slice(0, 50));

          // Call LangGraph Cloud with streaming
          // Pass access_token and ad_account_id via config.configurable
          const streamResponse = client.runs.stream(
            threadId, // Use conversation ID as thread ID
            GRAPH_NAME,
            {
              input: {
                messages: [{ role: "user", content: message }],
                accessToken: connection.access_token,
                adAccountId: connection.ad_account_id,
                userId: user.id,
              },
              config: {
                configurable: {
                  access_token: connection.access_token,
                  ad_account_id: connection.ad_account_id,
                  user_id: user.id,
                },
              },
              streamMode: "messages",
            }
          );

          // Process stream from LangGraph Cloud
          let chunkCount = 0;
          for await (const chunk of streamResponse) {
            chunkCount++;
            console.log("[Chat API] Chunk", chunkCount, "event:", chunk.event);

            // Handle different event types from LangGraph Cloud
            if (chunk.event === "messages/partial" || chunk.event === "messages/complete") {
              const data = chunk.data;
              
              // Extract AI message content
              if (Array.isArray(data)) {
                for (const msg of data) {
                  if (msg.type === "ai" && typeof msg.content === "string" && msg.content) {
                    // Only send new content (delta)
                    const newContent = msg.content.slice(fullResponse.length);
                    if (newContent) {
                      fullResponse = msg.content;
                      send("text", newContent);
                    }
                  }
                }
              } else if (data && typeof data === "object") {
                // Single message object
                const msg = data as { type?: string; content?: string };
                if (msg.type === "ai" && typeof msg.content === "string" && msg.content) {
                  const newContent = msg.content.slice(fullResponse.length);
                  if (newContent) {
                    fullResponse = msg.content;
                    send("text", newContent);
                  }
                }
              }
            } else if (chunk.event === "error") {
              console.error("[Chat API] LangGraph error:", chunk.data);
              send("text", `❌ Error: ${JSON.stringify(chunk.data)}`);
            }
          }

          console.log("[Chat API] Stream complete. Chunks:", chunkCount, "Response length:", fullResponse.length);

          // If no response was generated, send a fallback
          if (!fullResponse) {
            fullResponse = "I processed your request but didn't generate a response. Please try again.";
            send("text", fullResponse);
          }

          send("done", "");

          // Save assistant response
          await supabase.from("messages").insert({
            conversation_id: threadId,
            role: "assistant",
            content: fullResponse,
          });

          controller.close();
        } catch (error) {
          console.error("[Chat API] Error:", error);
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          
          // Check if it's a LangGraph connection error
          if (errorMsg.includes("fetch") || errorMsg.includes("network") || errorMsg.includes("ENOTFOUND")) {
            send("text", "❌ Could not connect to AI service. Please try again in a moment.");
          } else {
            send("text", `❌ Error: ${errorMsg}`);
          }
          
          send("done", "");
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { 
        "Content-Type": "text/event-stream", 
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("[Chat API] Fatal error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes - LangGraph Cloud handles the heavy lifting
