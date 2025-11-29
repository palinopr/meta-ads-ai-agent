/**
 * LangGraph Cloud Entry Point
 * 
 * This file exports the compiled graph for deployment to LangGraph Cloud.
 * The access token and ad account ID are passed via runtime config.
 */

import {
  StateGraph,
  MessagesAnnotation,
  END,
  START,
  Annotation,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { AIMessage, SystemMessage } from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";
import { createMetaToolsWithConfig, setRuntimeAccessToken } from "./tools";

// Define the state schema - includes runtime config fields
export const AgentState = Annotation.Root({
  ...MessagesAnnotation.spec,
  // User context - passed via runtime config
  userId: Annotation<string>(),
  adAccountId: Annotation<string | null>(),
  accessToken: Annotation<string>(), // Token passed at runtime
  // Pending confirmations for dangerous actions
  pendingAction: Annotation<{
    toolName: string;
    toolCallId: string;
    args: Record<string, unknown>;
    originalMessage: AIMessage;
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

// Core tool names for binding to the model (reduced set for speed)
const CORE_TOOL_NAMES = [
  "get_ad_accounts",
  "get_campaigns",
  "get_campaign",
  "get_account_insights",
  "get_campaign_insights",
  "get_ad_sets",
  "get_ads",
];

/**
 * Build the Meta Ads agent graph for LangGraph Cloud
 */
function buildGraph() {
  // Create tools that will read accessToken from config at runtime
  const { allTools, getToolsForToken } = createMetaToolsWithConfig();
  const coreTools = allTools.filter(t => CORE_TOOL_NAMES.includes(t.name));

  console.log("[Graph] Building with", coreTools.length, "core tools");

  // Initialize the LLM
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  const model = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.3,
    openAIApiKey: apiKey,
  }).bindTools(coreTools);

  // Create tool node with token setup wrapper
  const baseToolNode = new ToolNode(coreTools);
  
  // Wrapper that sets the access token before executing tools
  const toolNodeWithAuth = async (
    state: typeof AgentState.State,
    config?: RunnableConfig
  ): Promise<Partial<typeof AgentState.State>> => {
    // Set the runtime access token before tool execution
    if (state.accessToken) {
      console.log("[Tools] Setting runtime access token");
      setRuntimeAccessToken(state.accessToken);
    }
    
    // Execute the actual tools
    return baseToolNode.invoke(state, config);
  };

  // Agent node - calls the LLM
  const callModel = async (
    state: typeof AgentState.State,
    config?: RunnableConfig
  ): Promise<Partial<typeof AgentState.State>> => {
    // Set the runtime access token (also needed if tools were called inline)
    if (state.accessToken) {
      setRuntimeAccessToken(state.accessToken);
    }
    
    const messages = state.messages;
    const adAccountId = state.adAccountId;
    
    console.log("[Agent] callModel - messages:", messages.length, "adAccountId:", adAccountId, "hasToken:", !!state.accessToken);

    // Add system message with account context
    const hasSystemMessage = messages.some(m => m._getType() === "system");
    const systemPrompt = `You are a helpful AI assistant for Meta Ads.${adAccountId ? ` The user's ad account ID is: ${adAccountId}` : ''}

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
      : [new SystemMessage(systemPrompt), ...messages];

    try {
      const response = await model.invoke(messagesWithSystem);
      console.log("[Agent] Model response - tool_calls:", response.tool_calls?.length ?? 0);

      // Check for dangerous tool calls that need confirmation
      if (response.tool_calls && response.tool_calls.length > 0) {
        const dangerousCall = response.tool_calls.find(tc =>
          DANGEROUS_TOOLS.includes(tc.name)
        );

        if (dangerousCall) {
          return {
            messages: [response],
            pendingAction: {
              toolName: dangerousCall.name,
              toolCallId: dangerousCall.id ?? "",
              args: dangerousCall.args as Record<string, unknown>,
              originalMessage: response,
            },
          };
        }
      }

      return { messages: [response] };
    } catch (error) {
      console.error("[Agent] Model error:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      return { messages: [new AIMessage(`Sorry, I had trouble processing that: ${errorMsg}`)] };
    }
  };

  // Routing logic
  const shouldContinue = (
    state: typeof AgentState.State
  ): "tools" | "confirm" | typeof END => {
    const { messages, pendingAction } = state;
    const lastMessage = messages[messages.length - 1];

    if (pendingAction) {
      return "confirm";
    }

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

  // Confirmation node
  const confirmNode = async (
    state: typeof AgentState.State
  ): Promise<Partial<typeof AgentState.State>> => {
    const { pendingAction } = state;

    if (!pendingAction) {
      return {};
    }

    // Generate confirmation message
    const args = pendingAction.args;
    let confirmMessage = "";

    switch (pendingAction.toolName) {
      case "create_campaign":
        const budget = args.dailyBudget ? `$${(args.dailyBudget as number) / 100} per day` : "no budget yet";
        confirmMessage = `🚀 Ready to create your new ad!\n\n` +
          `• Name: "${args.name}"\n` +
          `• Goal: ${args.objective}\n` +
          `• Budget: ${budget}\n` +
          `• Status: ${args.status === "ACTIVE" ? "Will start running" : "Paused"}\n\n` +
          `Say **yes** to create or **no** to cancel`;
        break;

      case "update_campaign":
      case "update_ad_set":
      case "update_ad":
        confirmMessage = `✏️ I'll make these changes:\n\n${JSON.stringify(args.updates, null, 2)}\n\nSay **yes** or **no**`;
        break;

      case "delete_campaign":
      case "delete_ad_set":
      case "delete_ad":
        confirmMessage = `⚠️ This will permanently delete. Say **yes** to confirm or **no** to cancel`;
        break;

      default:
        confirmMessage = `Ready to: ${pendingAction.toolName}\n\nSay **yes** or **no**`;
    }

    return {
      messages: [new AIMessage(confirmMessage)],
    };
  };

  // Build the graph
  const workflow = new StateGraph(AgentState)
    .addNode("agent", callModel)
    .addNode("tools", toolNodeWithAuth) // Use wrapper that sets access token
    .addNode("confirm", confirmNode)
    .addEdge(START, "agent")
    .addConditionalEdges("agent", shouldContinue, {
      tools: "tools",
      confirm: "confirm",
      [END]: END,
    })
    .addEdge("tools", "agent")
    .addEdge("confirm", END);

  // Compile WITHOUT checkpointer - LangGraph Cloud manages checkpointing
  const graph = workflow.compile();

  return graph;
}

// Export the compiled graph for LangGraph Cloud
export const graph = buildGraph();

