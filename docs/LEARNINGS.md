# Learnings & Gotchas

## Learning 015: Meta OAuth Redirect URI Must Be Whitelisted in Facebook App

**Date**: 2024-11-29

**Issue**: After deploying to Vercel, clicking "Login with Meta" shows "URL Blocked" error: "This redirect failed because the redirect URI is not whitelisted in the app's Client OAuth Settings."

**Root Cause**: Vercel generates unique URLs for each deployment (e.g., `https://meta-ads-abc123-palinos-projects.vercel.app`), but the Facebook App only has specific URLs whitelisted.

**Solution**: In Facebook Developer Console → Your App → Facebook Login → Settings:
1. Enable "Client OAuth Login" = ON
2. Enable "Web OAuth Login" = ON  
3. Add ALL redirect URIs to "Valid OAuth Redirect URIs":
   - Production: `https://meta-ads-ai.vercel.app/api/auth/meta/callback`
   - Preview deployments: Add each Vercel URL as needed
   - Local: `http://localhost:3000/api/auth/meta/callback`

**Context**: Every time you get a new Vercel deployment URL, you may need to add it to the whitelist. Consider using a stable production domain.

---

## Learning 014: Frontend Expects SSE Streaming, Not JSON Response

**Date**: 2024-11-29

**Issue**: AI chat was showing "No response received" even though the backend was processing messages correctly.

**Root Cause**: The frontend ChatPanel was parsing Server-Sent Events (SSE) format:
```typescript
// Frontend expects SSE format
if (line.startsWith("data: ")) {
  const data = JSON.parse(line.slice(6));
  if (data.type === "text") streamedContent += data.value;
}
```

But the backend was returning plain JSON:
```typescript
// ❌ Backend returned JSON
return NextResponse.json({ response: fullResponse, conversationId: threadId });
```

**Solution**: Convert backend to SSE streaming format:
```typescript
// ✅ Backend now returns SSE stream
const stream = new ReadableStream({
  async start(controller) {
    const sendSSE = (type: string, value: string) => {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, value })}\n\n`));
    };
    sendSSE("conversationId", threadId);
    sendSSE("text", content);
    sendSSE("done", "");
  }
});
return new Response(stream, {
  headers: { "Content-Type": "text/event-stream" }
});
```

**Context**: When frontend and backend contract mismatch, the UI fails silently. Always verify the expected response format.

---

## Learning 013: OAuth Token Exchange - Use POST, Not GET with Secrets in URL

**Date**: 2024-11-29

**Issue**: The OAuth token exchange was sending `client_secret` in the URL query string via a GET request, exposing it in server logs, proxy logs, and potentially referrer headers.

**Root Cause**:
```typescript
// ❌ INSECURE - Secret in URL
const tokenParams = new URLSearchParams({
  client_id: appId,
  client_secret: appSecret,  // Exposed in logs!
  redirect_uri: redirectUri,
  code,
});
const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?${tokenParams.toString()}`;
await fetch(tokenUrl);  // GET request
```

**Solution**: Use POST with credentials in the request body:
```typescript
// ✅ SECURE - Secret in body, not URL
const tokenUrl = "https://graph.facebook.com/v21.0/oauth/access_token";
const tokenBody = new URLSearchParams({
  client_id: appId,
  client_secret: appSecret,
  redirect_uri: redirectUri,
  code,
});

await fetch(tokenUrl, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: tokenBody.toString(),
});
```

**Context**: OAuth 2.0 best practices require secrets to be sent in the request body, not URL. URLs can be logged by proxies, load balancers, and appear in browser history.

---

## Learning 012: Supabase SSR Client for Route Handlers with Cookie Management

**Date**: 2024-11-29

**Issue**: Using the basic `@supabase/supabase-js` client in Route Handlers for OAuth doesn't set session cookies, so the user isn't actually logged in after redirect.

**Root Cause**: The basic client doesn't manage browser cookies. After sign-in, the session exists server-side but the browser has no auth cookies:
```typescript
// ❌ Basic client - no cookie management
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(url, key);
await supabase.auth.signInWithPassword({ email, password });
// Sign-in works, but browser has no cookies!
```

**Solution**: Use `@supabase/ssr` with request/response cookies:
```typescript
// ✅ SSR client with cookie management
import { createServerClient, CookieOptions } from "@supabase/ssr";

function createRouteHandlerClient(request: NextRequest, response: NextResponse) {
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

// Create response FIRST, then client, then auth operations
const response = NextResponse.redirect(new URL("/dashboard", origin));
const supabase = createRouteHandlerClient(request, response);
await supabase.auth.signInWithPassword({ email, password });
return response; // Cookies are now set!
```

**Context**: Essential for custom OAuth flows in Next.js Route Handlers.

---

## Learning 011: Supabase MCP vs Environment Variables - Always Verify Project URL Match

**Date**: 2024-11-29

**Issue**: The Supabase MCP tool worked (`mcp_supabase_list_tables` returned data), but the app was getting `getaddrinfo ENOTFOUND` errors when connecting to Supabase.

**Root Cause**: The MCP was connected to project `weotbubgjuxaakzlhpzl`, but the environment variables pointed to a different (non-existent) project `igeuyfuxezvvenxjfnnn`.

**Solution**: Always verify the Supabase project URL in env vars matches the MCP-connected project:
```bash
# Check MCP connection
mcp_supabase_get_logs  # Shows actual project identifier in logs

# Verify env var
NEXT_PUBLIC_SUPABASE_URL=https://weotbubgjuxaakzlhpzl.supabase.co  # Must match!
```

**Context**: If MCP works but your app fails to connect, the env vars likely point to a wrong/deleted project.

---

## Learning 010: Supabase Middleware Blocks Auth API Routes

**Date**: 2024-11-29

**Issue**: Direct OAuth login API routes (`/api/auth/meta`) were being blocked by Supabase middleware, redirecting unauthenticated users to `/login` before the route could execute.

**Root Cause**: The middleware's `publicRoutes` list didn't include `/api/auth/` routes:
```typescript
// BAD - Missing API auth routes
const publicRoutes = ["/", "/login", "/signup", "/auth/callback"];
```

**Solution**: Add API auth routes to the public routes:
```typescript
// GOOD - Include API auth routes
const isPublicRoute = publicRoutes.some(
  (route) =>
    request.nextUrl.pathname === route ||
    request.nextUrl.pathname.startsWith("/auth/") ||
    request.nextUrl.pathname.startsWith("/api/auth/") // Allow auth API routes
);
```

**Context**: When implementing OAuth login flows that use API routes (bypassing Supabase's built-in OAuth), ensure those routes are accessible to unauthenticated users.

---

## Learning 009: LangGraph updateState May Replace Messages

**Date**: 2024-11-29

**Issue**: When calling `graph.updateState()` with a messages array, even though `MessagesAnnotation` has a reducer that should append, the behavior may replace the entire history instead.

**Root Cause**: Relying on reducer behavior without explicitly preserving existing messages:
```typescript
// ❌ May replace history
await graph.updateState(config, {
  messages: [new HumanMessage("yes"), new AIMessage("Done!")],
});
```

**Solution**: Always explicitly preserve existing messages:
```typescript
// ✅ Explicitly preserve history
const currentState = await graph.getState(config);
const existingMessages = currentState.values?.messages || [];

await graph.updateState(config, {
  messages: [...existingMessages, new HumanMessage("yes"), new AIMessage("Done!")],
});
```

**Context**: This is especially important in confirmation flows where you bypass the graph and update state directly. The conversation context (including the confirmation prompt) would be lost otherwise.

---

## Learning 008: LangGraph Graph Always Routes START -> agent

**Date**: 2024-11-29

**Issue**: When implementing human-in-the-loop confirmation, passing the original AIMessage with tool_calls to `stream()` doesn't work because the graph ALWAYS routes `START -> agent` first. The agent node re-invokes the LLM, which generates a NEW response instead of executing the stored tool calls.

**Root Cause**:
```typescript
// Graph definition
.addEdge(START, "agent")  // ALWAYS goes to agent first!
.addConditionalEdges("agent", shouldContinue, ...)

// On confirmation, even with correct messages, agent is invoked
await graph.stream({
  messages: [pendingAction.originalMessage], // Has tool_calls
}); 
// ❌ Agent sees tool_calls, but LLM generates NEW response, not execute!
```

**Solution**: Bypass the graph entirely for confirmation. Invoke the tool directly:
```typescript
// Store toolsMap when creating agent
const toolsMap = new Map(allTools.map(t => [t.name, t]));
return { graph, toolsMap };

// On confirmation, invoke tool directly
const tool = toolsMap.get(pendingAction.toolName);
const result = await tool.invoke(pendingAction.args);
return { type: "direct", content: result };
```

**Also Learned**: `streamMode: "messages"` only streams LLM-generated chunks, NOT manually created AIMessage objects. For static responses, return directly instead of streaming.

**Context**: Human-in-the-loop requires different handling than normal message flow.

---

## Learning 007: LangGraph Confirmation Workflow - Preserve Original Message

**Date**: 2024-11-29

**Issue**: When implementing human-in-the-loop confirmation for dangerous tools, the original tool call was lost after user confirmed.

**Root Cause**: 
```typescript
// BAD: Calling stream() with only "yes" message replaces state
await agent.stream({ messages: [new HumanMessage("yes")] }, config);
// Agent sees "yes" but doesn't know what tool to execute!
```

**Solution**: Store the full AIMessage (with tool_calls) in pendingAction, then restore it after confirmation:
```typescript
// Store original message when setting pending action
pendingAction: {
  toolName: dangerousCall.name,
  args: dangerousCall.args,
  originalMessage: response, // CRITICAL: Store full AIMessage
}

// On confirmation, restore the original message so tools node executes
await agent.updateState(config, {
  pendingAction: null,
  messages: [...existingMessages, new HumanMessage("yes"), pendingAction.originalMessage],
});
```

**Context**: LangGraph's shouldContinue needs to see an AIMessage with tool_calls to route to the tools node.

---

## Learning 006: Facebook OAuth Setup in Supabase

**Date**: 2024-11-29

**Pattern**: Facebook login requires both code AND Supabase dashboard configuration

**Code Side** (what we implemented):
```typescript
// Server action for Facebook OAuth
export async function signInWithFacebook() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "facebook",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });
  if (data.url) redirect(data.url);
}
```

**Dashboard Configuration Required**:
1. Supabase Dashboard → Authentication → Providers → Facebook
2. Enable Facebook provider
3. Add Facebook App ID and Secret (from developers.facebook.com)
4. Copy Supabase callback URL to Facebook App → Valid OAuth Redirect URIs

**Context**: Without dashboard configuration, OAuth will fail even if code is correct.

---

## Learning 005: Tool Organization Pattern

**Date**: 2024-11-29

**Pattern**: Group tools by operation type (read vs write) and entity

**Implementation**:
```typescript
// Factory function creates all tools
export function createMetaAdsTools(accessToken: string, adAccountId: string) {
  const client = new MetaAdsClient(accessToken);
  
  // READ tools - safe, no confirmation
  const getAdAccounts = tool(...);
  const getCampaigns = tool(...);
  
  // WRITE tools - dangerous, require confirmation
  const createCampaign = tool(...);
  const updateCampaign = tool(...);
  
  return [
    // Read first, then write
    getAdAccounts, getCampaigns, getAdSets, getAds, getInsights,
    // Then write operations
    createCampaign, updateCampaign, createAdSet, ...
  ];
}
```

**Context**: Makes it easy to identify and categorize tools for DANGEROUS_TOOLS list.

---

## Learning 004: LangGraph streamMode: "messages" Format

**Date**: 2024-11-29

**Issue**: Code was checking `if (Array.isArray(chunk))` when iterating over LangGraph stream, but with `streamMode: "messages"`, each chunk is a **tuple** `[message, metadata]`, not an array of messages.

**Solution**: Destructure the tuple correctly and use `isAIMessageChunk` from `@langchain/core/messages`:

```typescript
import { isAIMessageChunk } from "@langchain/core/messages";

// With streamMode: "messages", yields tuples [message, metadata]
for await (const [message, _metadata] of stream) {
  if (isAIMessageChunk(message) && typeof message.content === "string") {
    fullResponse += message.content;
  }
}
```

**Context**: This caused `fullResponse` to always be empty, resulting in empty assistant messages stored in the database.

---

## Learning 003: Supabase RLS Performance

**Date**: 2024-11-29

**Pattern**: Wrap `auth.uid()` in a subquery for better performance

```sql
-- ❌ Slow
CREATE POLICY "users_own_data" ON messages
  USING (user_id = auth.uid());

-- ✅ Fast
CREATE POLICY "users_own_data" ON messages
  USING (user_id = (SELECT auth.uid()));
```

**Context**: PostgreSQL query planner optimization.

---

## Learning 002: LangGraph PostgresSaver Setup

**Date**: 2024-11-29

**Pattern**: Always call `checkpointer.setup()` once before using

```typescript
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

const checkpointer = PostgresSaver.fromConnString(connectionString);
await checkpointer.setup(); // Creates tables if not exist
```

**Context**: Required for LangGraph persistence with Supabase.

---

## Learning 001: Directory Names with Spaces

**Date**: 2024-11-29

**Issue**: `create-next-app` doesn't like spaces in directory names

**Solution**: Either rename the directory or create project files manually

**Context**: The workspace is `meta saas` (with space), which npm doesn't like for project names.

---

## Template for New Learnings

```markdown
## Learning XXX: [Title]

**Date**: YYYY-MM-DD

**Issue/Pattern**: [What you discovered]

**Solution**: [How to handle it]

**Context**: [When this applies]
```
