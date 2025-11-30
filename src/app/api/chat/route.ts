import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Client } from "@langchain/langgraph-sdk";

// LangGraph Cloud configuration
const LANGGRAPH_URL = process.env.LANGGRAPH_DEPLOYMENT_URL || "https://meta-ads-ai-prod-181ea4f5bba65af69e75dbfc05c3df0d.us.langgraph.app";
const LANGGRAPH_API_KEY = process.env.LANGGRAPH_API_KEY || process.env.LANGCHAIN_API_KEY;
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

    // Get Meta connection - use maybeSingle() to handle 0 rows gracefully
    const { data: connection } = await supabase
      .from("meta_connections")
      .select("access_token, ad_account_id, token_expires_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!connection) {
      return NextResponse.json({ error: "No Meta connection found" }, { status: 400 });
    }

    if (new Date(connection.token_expires_at) < new Date()) {
      return NextResponse.json({ error: "Token expired" }, { status: 400 });
    }

    // Get or create conversation and LangGraph thread mapping
    let supabaseConversationId = conversationId;
    let langGraphThreadId: string | null = null;
    
    if (!supabaseConversationId) {
      // Create new conversation in Supabase
      const { data: conv } = await supabase
        .from("conversations")
        .insert({ user_id: user.id, title: message.slice(0, 50) })
        .select("id, langgraph_thread_id")
        .single();
      supabaseConversationId = conv?.id;
      langGraphThreadId = conv?.langgraph_thread_id || null;
    } else {
      // Retrieve existing conversation with its LangGraph thread ID
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("langgraph_thread_id")
        .eq("id", supabaseConversationId)
        .single();
      langGraphThreadId = existingConv?.langgraph_thread_id || null;
    }
    
    // Use supabaseConversationId for all Supabase operations
    const threadId = supabaseConversationId;

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

          // Get or create LangGraph thread
          // IMPORTANT: LangGraph Cloud needs its own thread IDs, not Supabase conversation IDs
          let lgThreadId = langGraphThreadId;
          
          if (!lgThreadId) {
            // Create new LangGraph thread and store the mapping
            console.log("[Chat API] Creating new LangGraph thread...");
            const lgThread = await client.threads.create();
            lgThreadId = lgThread.thread_id;
            console.log("[Chat API] Created LangGraph thread:", lgThreadId);
            
            // Store the mapping in Supabase for future messages in this conversation
            await supabase
              .from("conversations")
              .update({ langgraph_thread_id: lgThreadId })
              .eq("id", threadId);
            console.log("[Chat API] Stored LangGraph thread mapping for conversation:", threadId);
          } else {
            console.log("[Chat API] Using existing LangGraph thread:", lgThreadId);
          }

          // Call LangGraph Cloud with streaming
          // Pass access_token and ad_account_id via input (the graph reads from input state)
          const streamResponse = client.runs.stream(
            lgThreadId, // Use LangGraph thread ID (not Supabase conversation ID)
            GRAPH_NAME,
            {
              input: {
                messages: [{ role: "user", content: message }],
                accessToken: connection.access_token,
                adAccountId: connection.ad_account_id,
                userId: user.id,
              },
              streamMode: "messages",
            }
          );

          // Process stream from LangGraph Cloud
          let chunkCount = 0;
          for await (const chunk of streamResponse) {
            chunkCount++;
            
            // Log every chunk for debugging
            const dataStr = JSON.stringify(chunk.data).slice(0, 300);
            console.log(`[Chat API] Chunk ${chunkCount} event: "${chunk.event}" data: ${dataStr}`);

            // Handle ALL event types - the SDK uses different events
            const event = chunk.event;
            const data = chunk.data;

            // For streamMode: "messages", data is an array of messages
            // Event types: metadata, messages/partial, messages/complete, end, error
            if (Array.isArray(data)) {
              for (const msg of data) {
                // Messages have: type (ai/human/tool), content, tool_calls
                const msgType = msg.type || msg._getType?.() || "";
                const content = msg.content;
                
                // Check if it's an AI message with content
                if ((msgType === "ai" || msgType === "AIMessage" || msgType === "AIMessageChunk") && 
                    typeof content === "string" && content) {
                  // Only send new content (delta) to avoid duplicates
                  const newContent = content.slice(fullResponse.length);
                  if (newContent) {
                    console.log(`[Chat API] Sending AI content: ${newContent.slice(0, 50)}...`);
                    fullResponse = content;
                    send("text", newContent);
                  }
                }
              }
            } else if (data && typeof data === "object" && "messages" in data) {
              // Handle values/updates events that contain messages array
              const messages = (data as { messages: Array<{ type?: string; content?: string }> }).messages;
              if (Array.isArray(messages)) {
                for (const msg of messages) {
                  const msgType = msg.type || "";
                  if ((msgType === "ai" || msgType === "AIMessage") && 
                      typeof msg.content === "string" && msg.content) {
                    const newContent = msg.content.slice(fullResponse.length);
                    if (newContent) {
                      console.log(`[Chat API] Sending AI content from values: ${newContent.slice(0, 50)}...`);
                      fullResponse = msg.content;
                      send("text", newContent);
                    }
                  }
                }
              }
            }

            // Handle error events
            if (event === "error") {
              console.error("[Chat API] LangGraph error:", data);
              send("text", `❌ Error: ${JSON.stringify(data)}`);
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
