import {
  StateGraph,
  MessagesAnnotation,
  END,
  START,
  MemorySaver,
  Annotation,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { AIMessage, BaseMessage, HumanMessage, SystemMessage, AIMessageChunk } from "@langchain/core/messages";
import { createMetaTools } from "./tools";

// Define the state schema with additional context
export const AgentState = Annotation.Root({
  ...MessagesAnnotation.spec,
  // User context
  userId: Annotation<string>(),
  adAccountId: Annotation<string | null>(),
  // Pending confirmations for dangerous actions
  // Stores the full AIMessage so we can restore it after confirmation
  pendingAction: Annotation<{
    toolName: string;
    toolCallId: string;
    args: Record<string, unknown>;
    originalMessage: AIMessage; // Store the full message to restore after confirmation
  } | null>(),
});

// ALL tools that require confirmation before execution
const DANGEROUS_TOOLS = [
  "create_campaign",
  "update_campaign",
  "delete_campaign",
  "create_ad_set",
  "update_ad_set",
  "delete_ad_set",
  "create_ad",
  "update_ad",
  "delete_ad",
  "create_custom_audience",
  "create_lookalike_audience",
];

/**
 * Create a Meta Ads agent with LangGraph
 */
export function createMetaAdsAgent(accessToken: string) {
  // Create tools with the user's access token
  const { allTools } = createMetaTools(accessToken);

  // CRITICAL: Only bind CORE tools to avoid OpenAI timeout (31 tools is too slow)
  // Core tools for 95% of queries: accounts, campaigns, insights
  const coreToolNames = [
    "get_ad_accounts",
    "get_campaigns",
    "get_campaign",
    "get_account_insights",
    "get_campaign_insights",
    "get_ad_sets",
    "get_ads",
  ];
  const coreTools = allTools.filter(t => coreToolNames.includes(t.name));
  console.log("[Agent] Using", coreTools.length, "core tools (reduced from", allTools.length, ")");

  // Initialize the LLM (using GPT-4o-mini for speed)
  const apiKey = process.env.OPENAI_API_KEY;
  console.log("[Agent] OpenAI API key present:", !!apiKey, "length:", apiKey?.length || 0);

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  const model = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.3,
    openAIApiKey: apiKey,
    timeout: 30000, // 30 second timeout
  }).bindTools(coreTools); // ONLY core tools for speed!

  // Create the tool node with CORE tools only (must match what model can call)
  const toolNode = new ToolNode(coreTools);

  // Store ALL tools for external access (needed for direct tool execution on confirmation)
  // This allows write operations to still work when user confirms
  const toolsMap = new Map(allTools.map(t => [t.name, t]));

  // Define the agent node
  const callModel = async (
    state: typeof AgentState.State
  ): Promise<Partial<typeof AgentState.State>> => {
    console.log("[Agent] callModel started");
    const messages = state.messages;
    const adAccountId = state.adAccountId;
    console.log("[Agent] Messages count:", messages.length, "adAccountId:", adAccountId);

    // Add system message if not present - SHORT prompt with tool awareness
    // CRITICAL: Include the ad account ID so agent doesn't need to fetch it first!
    const hasSystemMessage = messages.some(
      (m) => m._getType() === "system"
    );
    const shortPrompt = `You are a helpful AI assistant for Meta Ads.${adAccountId ? ` The user's ad account ID is: ${adAccountId}` : ''}

You can:
- Get campaigns: get_campaigns(accountId) - use the user's account ID above
- Get campaign details: get_campaign(campaignId)  
- Get performance metrics: get_account_insights(accountId), get_campaign_insights(campaignId)
- Get ad sets and ads: get_ad_sets(campaignId), get_ads(adSetId)
- Get ad accounts: get_ad_accounts() - only if user asks about accounts

IMPORTANT: When user asks about campaigns, IMMEDIATELY call get_campaigns with accountId="${adAccountId || 'get from get_ad_accounts'}"
Be friendly and explain numbers simply (e.g., "You spent $50" not "5000 cents").`;
    const messagesWithSystem = hasSystemMessage
      ? messages
      : [new SystemMessage(shortPrompt), ...messages];

    console.log("[Agent] Invoking model with", messagesWithSystem.length, "messages...");
    const startTime = Date.now();

    try {
      const response = await model.invoke(messagesWithSystem);
      console.log("[Agent] Model response received in", Date.now() - startTime, "ms");
      console.log("[Agent] Response type:", response._getType(), "tool_calls:", response.tool_calls?.length ?? 0);

    // Check if the response contains dangerous tool calls
    if (response.tool_calls && response.tool_calls.length > 0) {
      const dangerousCall = response.tool_calls.find((tc) =>
        DANGEROUS_TOOLS.includes(tc.name)
      );

      if (dangerousCall) {
        // Store the pending action for confirmation, including the full message
        // so we can restore it after user confirms
        return {
          messages: [response],
          pendingAction: {
            toolName: dangerousCall.name,
            toolCallId: dangerousCall.id ?? "",
            args: dangerousCall.args as Record<string, unknown>,
            originalMessage: response, // Store full AIMessage for restoration
          },
        };
      }
    }

      return { messages: [response] };
    } catch (error) {
      console.error("[Agent] Model invoke error:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      return { messages: [new AIMessage(`Sorry, I had trouble processing that: ${errorMsg}`)] };
    }
  };

  // Define the routing logic
  const shouldContinue = (
    state: typeof AgentState.State
  ): "tools" | "confirm" | typeof END => {
    const { messages, pendingAction } = state;
    const lastMessage = messages[messages.length - 1];

    // If there's a pending action awaiting confirmation, go to confirm node
    if (pendingAction) {
      return "confirm";
    }

    // If the last message has tool calls, go to tools
    if (
      lastMessage &&
      "tool_calls" in lastMessage &&
      Array.isArray((lastMessage as AIMessage).tool_calls) &&
      (lastMessage as AIMessage).tool_calls!.length > 0
    ) {
      return "tools";
    }

    return END;
  };

  // Confirmation node - generates friendly confirmation messages
  const confirmNode = async (
    state: typeof AgentState.State
  ): Promise<Partial<typeof AgentState.State>> => {
    const { pendingAction } = state;

    if (!pendingAction) {
      return {};
    }

    // Generate friendly confirmation message based on action type
    let confirmMessage = "";
    const args = pendingAction.args;

    switch (pendingAction.toolName) {
      case "create_campaign":
        const budget = args.dailyBudget ? `$${(args.dailyBudget as number) / 100} per day` : "no budget yet";
        confirmMessage = `🚀 Ready to create your new ad!\n\n` +
          `Here's what I'll set up:\n` +
          `• Name: "${args.name}"\n` +
          `• Goal: ${args.objective === "OUTCOME_TRAFFIC" ? "Get website visits" : args.objective === "OUTCOME_SALES" ? "Get sales" : args.objective}\n` +
          `• Budget: ${budget}\n` +
          `• Status: ${args.status === "ACTIVE" ? "Will start running right away" : "Will be paused (you can turn it on later)"}\n\n` +
          `Should I create this? Just say **yes** or **no**`;
        break;

      case "update_campaign":
        confirmMessage = `✏️ I'll make these changes to your ad:\n\n` +
          `${formatUpdatesForHuman(args.updates as Record<string, unknown>)}\n\n` +
          `Sound good? Say **yes** to update or **no** to cancel`;
        break;

      case "delete_campaign":
        confirmMessage = `⚠️ Just to be sure - you want me to delete this ad?\n\n` +
          `Once deleted, it's gone forever and can't be recovered.\n\n` +
          `Say **yes** to delete or **no** to keep it`;
        break;

      case "create_ad_set":
        confirmMessage = `🎯 Ready to set up your ad targeting!\n\n` +
          `• Name: "${args.name}"\n` +
          `• Budget: $${(args.dailyBudget as number) / 100} per day\n` +
          `• Goal: ${formatOptimizationGoal(args.optimizationGoal as string)}\n\n` +
          `Should I create this? Say **yes** or **no**`;
        break;

      case "update_ad_set":
        confirmMessage = `✏️ I'll update your ad targeting:\n\n` +
          `${formatUpdatesForHuman(args.updates as Record<string, unknown>)}\n\n` +
          `Sound good? Say **yes** or **no**`;
        break;

      case "delete_ad_set":
        confirmMessage = `⚠️ This will delete the targeting group and ALL ads in it.\n\n` +
          `Are you sure? Say **yes** to delete or **no** to keep it`;
        break;

      case "create_ad":
        confirmMessage = `📢 Ready to create your ad!\n\n` +
          `• Name: "${args.name}"\n` +
          (args.headline ? `• Headline: "${args.headline}"\n` : "") +
          (args.message ? `• Text: "${args.message}"\n` : "") +
          (args.link ? `• Link: ${args.link}\n` : "") +
          `• Status: ${args.status === "ACTIVE" ? "Will start running right away" : "Will be paused"}\n\n` +
          `Should I create this ad? Say **yes** or **no**`;
        break;

      case "update_ad":
        confirmMessage = `✏️ I'll update your ad:\n\n` +
          `${formatUpdatesForHuman(args.updates as Record<string, unknown>)}\n\n` +
          `Sound good? Say **yes** or **no**`;
        break;

      case "delete_ad":
        confirmMessage = `⚠️ This will permanently delete your ad.\n\n` +
          `Say **yes** to delete or **no** to keep it`;
        break;

      case "create_custom_audience":
        confirmMessage = `👥 I'll create a new audience for you!\n\n` +
          `• Name: "${args.name}"\n` +
          `• Type: ${args.subtype}\n\n` +
          `Ready to create? Say **yes** or **no**`;
        break;

      case "create_lookalike_audience":
        confirmMessage = `👥 I'll find people similar to your existing audience!\n\n` +
          `• Name: "${args.name}"\n` +
          `• Country: ${args.country}\n` +
          `• Size: ${(args.ratio as number) * 100}% (${(args.ratio as number) <= 0.01 ? "very similar" : (args.ratio as number) <= 0.05 ? "similar" : "broader reach"})\n\n` +
          `Ready to create? Say **yes** or **no**`;
        break;

      default:
        confirmMessage = `I'm ready to make this change. Here's what I'll do:\n\n` +
          `${JSON.stringify(args, null, 2)}\n\n` +
          `Should I go ahead? Say **yes** or **no**`;
    }

    return {
      messages: [new AIMessage(confirmMessage)],
    };
  };

  // Helper to format updates in human-friendly way
  function formatUpdatesForHuman(updates: Record<string, unknown>): string {
    const lines: string[] = [];
    for (const [key, value] of Object.entries(updates)) {
      if (key === "status") {
        lines.push(`• Status: ${value === "ACTIVE" ? "Turn ON" : value === "PAUSED" ? "Pause" : value}`);
      } else if (key === "daily_budget" || key === "dailyBudget") {
        lines.push(`• Daily budget: $${(value as number) / 100}`);
      } else if (key === "lifetime_budget" || key === "lifetimeBudget") {
        lines.push(`• Total budget: $${(value as number) / 100}`);
      } else if (key === "name") {
        lines.push(`• Name: "${value}"`);
      } else {
        lines.push(`• ${key}: ${value}`);
      }
    }
    return lines.join("\n");
  }

  // Helper to format optimization goals
  function formatOptimizationGoal(goal: string): string {
    const goals: Record<string, string> = {
      "LINK_CLICKS": "Get clicks to your website",
      "LANDING_PAGE_VIEWS": "Get people to view your page",
      "IMPRESSIONS": "Show your ad to as many people as possible",
      "REACH": "Reach as many unique people as possible",
      "CONVERSIONS": "Get sales or sign-ups",
      "VALUE": "Maximize your return on ad spend",
    };
    return goals[goal] || goal;
  }

  // Build the graph
  console.log("[Agent] Building workflow graph...");
  const workflow = new StateGraph(AgentState)
    .addNode("agent", callModel)
    .addNode("tools", toolNode)
    .addNode("confirm", confirmNode)
    .addEdge(START, "agent")
    .addConditionalEdges("agent", shouldContinue, {
      tools: "tools",
      confirm: "confirm",
      [END]: END,
    })
    .addEdge("tools", "agent")
    .addEdge("confirm", END); // After confirmation message, wait for user input

  // Compile with memory
  console.log("[Agent] Compiling graph with checkpointer...");
  const checkpointer = new MemorySaver();
  const app = workflow.compile({ checkpointer });
  console.log("[Agent] Graph compiled successfully");

  // Return both the graph and toolsMap for direct tool execution
  return { graph: app, toolsMap };
}

// Type for stream metadata from LangGraph messages stream mode
interface StreamMetadata {
  langgraph_step?: number;
  langgraph_node?: string;
  langgraph_triggers?: string[];
  langgraph_checkpoint_ns?: string;
  checkpoint_ns?: string;
  ls_provider?: string;
  ls_model_name?: string;
  ls_model_type?: string;
}

// Type for the tuple yielded by streamMode: "messages"
type MessageStreamTuple = [AIMessageChunk | BaseMessage, StreamMetadata];

// Result type - either a stream or a direct response (for confirmation/cancellation)
export type ProcessMessageResult = 
  | { type: "stream"; stream: AsyncIterable<MessageStreamTuple> }
  | { type: "direct"; content: string };

/**
 * Process a user message with the agent
 */
export async function processMessage(
  agentBundle: ReturnType<typeof createMetaAdsAgent>,
  message: string,
  threadId: string,
  userId: string,
  adAccountId?: string
): Promise<ProcessMessageResult> {
  console.log("[Agent] processMessage started for:", message.slice(0, 30));
  const { graph, toolsMap } = agentBundle;
  const config = { configurable: { thread_id: threadId } };

  // Get current state to check for pending confirmations (with timeout)
  console.log("[Agent] Calling graph.getState()...");
  const stateStart = Date.now();
  let currentState;
  try {
    const stateTimeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("getState timed out after 10s")), 10000);
    });
    currentState = await Promise.race([graph.getState(config), stateTimeout]);
    console.log("[Agent] graph.getState() completed in", Date.now() - stateStart, "ms");
  } catch (error) {
    console.error("[Agent] graph.getState() failed:", error);
    // Return empty state on timeout
    currentState = { values: {} };
  }
  const pendingAction = currentState.values?.pendingAction;

  // If there's a pending action, handle confirmation
  if (pendingAction) {
    const isConfirmed = message.toLowerCase().trim() === "yes";
    // Preserve existing message history
    const existingMessages = currentState.values?.messages || [];

    if (isConfirmed) {
      // User confirmed - execute the tool directly (bypass graph to avoid agent re-invocation)
      const tool = toolsMap.get(pendingAction.toolName);
      
      if (!tool) {
        // Clear pending and return error (preserve message history)
        await graph.updateState(config, { 
          pendingAction: null,
          messages: [
            ...existingMessages,
            new HumanMessage("yes"),
            new AIMessage(`❌ Error: Tool "${pendingAction.toolName}" not found.`),
          ],
        });
        return { type: "direct", content: `❌ Error: Tool "${pendingAction.toolName}" not found.` };
      }

      try {
        // Execute the tool directly with stored args
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (tool as any).invoke(pendingAction.args);
        const resultContent = `✅ **Action completed!**\n\nResult:\n\`\`\`json\n${typeof result === 'string' ? result : JSON.stringify(result, null, 2)}\n\`\`\``;
        
        // Clear pending action and APPEND to existing messages (preserve history)
        await graph.updateState(config, {
          pendingAction: null,
          messages: [
            ...existingMessages,
            new HumanMessage("yes"),
            new AIMessage(resultContent),
          ],
        });

        return { type: "direct", content: resultContent };
      } catch (error) {
        // Clear pending and return error (preserve message history)
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorContent = `❌ **Action failed:**\n\n${errorMessage}`;
        await graph.updateState(config, { 
          pendingAction: null,
          messages: [
            ...existingMessages,
            new HumanMessage("yes"),
            new AIMessage(errorContent),
          ],
        });
        return { type: "direct", content: errorContent };
      }
    } else {
      // Cancel the action - APPEND to existing messages (preserve history)
      const cancelContent = "✅ Action cancelled. How else can I help you?";
      await graph.updateState(config, {
        pendingAction: null,
        messages: [
          ...existingMessages,
          new HumanMessage(message),
          new AIMessage(cancelContent),
        ],
      });

      return { type: "direct", content: cancelContent };
    }
  }

  // Normal message processing - use the graph with timeout wrapper
  console.log("[Agent] No pending action, starting graph.stream()...");
  console.log("[Agent] Message:", message.slice(0, 50));

  try {
    // Create a timeout promise - allow more time for tool calls
    const timeoutMs = 55000; // 55 seconds (just under Vercel's 60s limit)
    console.log("[Agent] Creating graph.stream() with", timeoutMs/1000, "second timeout...");
    const streamStart = Date.now();

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Graph stream timed out after ${timeoutMs/1000} seconds`)), timeoutMs);
    });

    console.log("[Agent] Calling graph.stream() NOW...");
    const streamPromise = graph.stream(
      {
        messages: [new HumanMessage(message)],
        userId,
        adAccountId: adAccountId ?? null,
      },
      { ...config, streamMode: "messages" }
    );

    // Race between stream and timeout
    const stream = await Promise.race([streamPromise, timeoutPromise]);
    console.log("[Agent] graph.stream() returned successfully in", Date.now() - streamStart, "ms");

    return { type: "stream", stream: stream as AsyncIterable<MessageStreamTuple> };
  } catch (error) {
    console.error("[Agent] Error in graph.stream():", error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Return a direct error response instead of crashing
    return {
      type: "direct",
      content: `❌ Sorry, I had trouble processing your request: ${errorMessage}. Please try again!`
    };
  }
}
