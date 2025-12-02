# Learnings & Gotchas

## Learning 030: Meta API Data Size Limits - Chunked Fetching Strategy

**Date**: 2024-12-02

**Issue**: When selecting "Maximum" date range (2 years), Meta API returns error "Please reduce the amount of data you're asking for".

**Root Cause**: Requesting daily data (`time_increment: "1"`) for 730 days exceeds Meta's single-request data limit. This is separate from rate limiting - it's about the *volume* of data in one request.

**Solution**: Implement chunked fetching for large date ranges:

```typescript
// Detect if chunking is needed (>60 days)
const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
if (daysDiff > 60) {
  return this.getAccountInsightsChunked(accountId, options, 30); // 30-day chunks
}
```

**CRITICAL**: **Use PARALLEL BATCHES, not sequential fetching!**

Sequential fetching (25 chunks * 3s = 75s) exceeds Vercel's 60-second timeout!

```typescript
// Process in PARALLEL BATCHES of 5 to stay within Vercel timeout
const BATCH_SIZE = 5;

for (let batchStart = 0; batchStart < chunks.length; batchStart += BATCH_SIZE) {
  const batch = chunks.slice(batchStart, batchStart + BATCH_SIZE);
  
  // Fetch ALL chunks in this batch in PARALLEL
  const batchPromises = batch.map(chunk => 
    this.getAccountInsightsSingleRequest(accountId, { ...options, time_range: chunk })
  );
  
  const batchResults = await Promise.all(batchPromises);
  for (const result of batchResults) {
    allInsights.push(...result.data);
  }
  
  await delay(100); // Small delay between batches
}
```

**Time comparison**:
- Sequential: 25 chunks * 3s = ~75 seconds ❌ TIMEOUT
- Parallel batches: 5 batches * 3s = ~15 seconds ✅ WORKS

**Key Points**:
- 30-day chunks work well (not too small = many requests, not too large = data errors)
- **Parallel batches of 5** to stay within Vercel's 60-second limit
- 100ms delay between batches to avoid rate limits
- For "Maximum" (730 days) = ~25 chunks in 5 batches = ~15 seconds

**Error Detection**:
```typescript
// New error class for data size issues
export class MetaDataSizeError extends Error { ... }

// Detection in parseMetaError()
if (message.includes("reduce the amount of data") || message.includes("too much data")) {
  return { isDataSizeError: true, ... };
}
```

---

## Learning 029: Meta API Rate Limiting - Detection and Caching Strategy

**Date**: 2024-12-02

**Issue**: Dashboard showing "Application request limit reached" error. The Insights page was hitting Meta's API rate limits (~200 calls/hour per ad account).

**Root Cause**: Each page load, date range change, or filter selection triggered multiple API calls to Meta. With no caching, even normal usage quickly exceeded the rate limit.

**Meta Rate Limit Error Codes**:
- `4` - Application request limit reached
- `17` - User request limit reached  
- `32` - Page request limit reached
- `613` - Calls to this API have exceeded the rate limit

**Solution**: Implement a multi-layer defense:

1. **Rate Limit Detection**:
```typescript
// Custom error class
export class MetaRateLimitError extends Error {
  constructor(message: string, public retryAfter?: number, public callCount?: number) {
    super(message);
    this.name = "MetaRateLimitError";
  }
}

// Detection in client
const rateLimitCodes = [4, 17, 32, 613];
if (rateLimitCodes.includes(error.code)) {
  throw new MetaRateLimitError(message);
}
```

2. **Response Caching**:
```typescript
// Simple in-memory cache with TTL
export async function getOrSetCache<T>(key: string, fetcher: () => Promise<T>, ttl: number = 60000): Promise<T> {
  const cached = getCache<T>(key);
  if (cached) return cached;
  const result = await fetcher();
  setCache(key, result, ttl);
  return result;
}

// Usage in API route
const cacheKey = `insights-${accountId}-${dateRange}`;
const data = await getOrSetCache(cacheKey, fetchInsights, 300000); // 5 min TTL
```

3. **User-Friendly Error State**:
```typescript
// API returns 429 with errorType
if (error instanceof MetaRateLimitError) {
  return NextResponse.json({ errorType: "RATE_LIMIT", message: "..." }, { status: 429 });
}

// Frontend detects and shows rate-limit empty state
if (response.status === 429 || errorData.errorType === "RATE_LIMIT") {
  setIsRateLimited(true);
}
```

**Context**: Meta allows ~200 API calls per hour per ad account. For production apps with many users, consider:
- Redis/Memcached for distributed caching
- Queue-based request throttling
- User-specific rate limit tracking
- Exponential backoff on retries

---

## Learning 028: Meta Insights API Pagination - Must Fetch All Pages

**Date**: 2024-12-01

**Issue**: Active campaigns with spend weren't showing insights when "Maximum" date range was selected. The API was returning data, but most campaigns showed "—" for all metrics.

**Root Cause**: Meta's Insights API **paginates results** (typically 25-100 records per page). When requesting Maximum (2 years of data), Meta returns hundreds or thousands of insight records across multiple pages. Our code was only fetching the **first page**, so most campaigns weren't getting matched:

```typescript
// ❌ Only gets first page
const result = await this.request(`/${accountId}/insights?...`);
const insights = result.data || []; // Only first 25-100 records!
```

**Solution**: Implement pagination loop to fetch all pages:

```typescript
// ✅ Fetch all pages
const allInsights: AdInsights[] = [];
let nextUrl: string | null = `/${accountId}/insights?...`;
let pageCount = 0;

while (nextUrl && pageCount < 100) {
  const result = await this.request(nextUrl);
  allInsights.push(...(result.data || []));
  
  if (result.paging?.next) {
    // Extract path from full URL
    const nextUrlObj = new URL(result.paging.next);
    nextUrl = nextUrlObj.pathname + nextUrlObj.search;
  } else {
    nextUrl = null;
  }
  pageCount++;
}
```

**Additional Issue**: Meta can return multiple insight rows per campaign (date breakdowns). We need to aggregate them:

```typescript
// Aggregate insights if campaign already exists
const existing = insightsMap.get(campaignId);
if (existing) {
  // Sum numeric values
  insightsMap.set(campaignId, {
    spend: (parseFloat(existing.spend) + parseFloat(newSpend)).toFixed(2),
    impressions: (parseInt(existing.impressions) + parseInt(newImpressions)).toString(),
    // ... etc
  });
}
```

**Context**: This is critical for Maximum date range queries where Meta returns large datasets. Always check for `paging.next` in Meta API responses and fetch all pages.

---

## Learning 027: Active Campaigns Without Delivery Have No Insights Data

**Date**: 2024-12-01

**Issue**: Active campaigns showing "—" for all metrics while paused/inactive campaigns displayed data correctly.

**Root Cause**: This is **expected behavior** from Meta API. The `status` field shows what YOU configured (ACTIVE, PAUSED), but `effective_status` shows the actual delivery state:

```typescript
// Campaign can be ACTIVE but not delivering
{
  status: "ACTIVE",           // What you set
  effective_status: "PENDING_REVIEW"  // Why it's not delivering
}
```

Possible `effective_status` values:
- `ACTIVE` - Actually delivering
- `PENDING_REVIEW` - Awaiting Meta's ad review
- `IN_PROCESS` - Being processed
- `WITH_ISSUES` - Has problems preventing delivery
- `PAUSED` - Manually paused
- `CAMPAIGN_PAUSED` - Parent campaign is paused
- `ARCHIVED` - Archived
- `DELETED` - Deleted

**Solution**: 
1. Request `effective_status` from Meta API alongside `status`
2. Display `effective_status` in the UI with tooltips explaining each status
3. Add informative empty state message explaining active campaigns may not have data if new/pending

```typescript
// In meta/client.ts getCampaigns()
const fields = [
  "id", "name", "status", 
  "effective_status",  // ADD THIS
  "objective", ...
].join(",");
```

**Context**: Users see "ACTIVE" campaigns with no performance data and think it's a bug. By showing `effective_status`, they can understand that "ACTIVE" doesn't mean "delivering" - the campaign might be pending review, processing, or have issues.

---

## Learning 026: Server-Side vs Client-Side Data Mismatch on Initial Load

**Date**: 2024-12-01

**Issue**: Dashboard showing wrong data after page refresh. Server-side rendered data didn't match the client-side displayed date range.

**Root Cause**: Classic SSR/CSR state mismatch:
- Server-side render (`dashboard/page.tsx`) used hardcoded `date_preset: "today"`
- Client-side loaded saved date range from localStorage (could be "Maximum", "Last 30 Days", etc.)
- Initial data was always "Today" but UI showed user's saved preference
- Data only synced after user clicked the date picker

```typescript
// ❌ Server always uses "today"
const insightsResult = await metaClient.getAccountInsights(accountId, { date_preset: "today", level: "campaign" });

// Client shows saved value from localStorage
const [dateRange] = useState(() => localStorage.getItem("meta-ads-date-range") || "Today");
```

**Solution**: Add auto-fetch on component mount when saved setting differs from server default:
```typescript
// ✅ Sync data on mount if saved date range != default
const [initialFetchDone, setInitialFetchDone] = useState(false);
useEffect(() => {
  if (!initialFetchDone && dateRange !== "Today" && accessToken && accountId) {
    setInitialFetchDone(true);
    fetchCampaigns(dateRange);  // Fetch with correct date range
  } else if (!initialFetchDone) {
    setInitialFetchDone(true);
  }
}, [initialFetchDone, dateRange, accessToken, accountId, fetchCampaigns]);
```

**Context**: Common pattern in Next.js apps where server-side defaults don't match client-side persisted settings. The fix ensures data is re-fetched client-side if there's a mismatch, providing a seamless user experience.

---

## Learning 025: TypeScript Union Type Dynamic Property Access

**Date**: 2024-12-01

**Issue**: When sorting a table with rows of different types (union type), TypeScript complained about accessing properties dynamically:
```typescript
type RowType = CampaignRow | AdSetRow | AdRow;

// ❌ TypeScript error: 
// Conversion of type 'CampaignRow | AdSetRow | AdRow' to type 'Record<string, unknown>' 
// may be a mistake because neither type sufficiently overlaps with the other.
const sorted = data.sort((a, b) => {
  const aVal = (a as Record<string, unknown>)[sortConfig.key];  // Error!
  const bVal = (b as Record<string, unknown>)[sortConfig.key];
});
```

**Root Cause**: TypeScript's type narrowing doesn't allow direct casting from a specific union type to a generic Record type because the types don't overlap sufficiently.

**Solution**: Cast to `unknown` first, then to `Record<string, unknown>`:
```typescript
// ✅ Works - double cast through unknown
const sorted = data.sort((a, b) => {
  const aVal = (a as unknown as Record<string, unknown>)[sortConfig.key];
  const bVal = (b as unknown as Record<string, unknown>)[sortConfig.key];
  // ... sorting logic
});
```

**Context**: Common when building generic components that handle multiple data types (like tables with different row schemas). The double-cast pattern (`as unknown as TargetType`) is the standard workaround when TypeScript's type inference is too strict.

---

## Learning 024: React Key Collisions from Date.now() IDs

**Date**: 2024-12-01

**Issue**: In the chat UI, user messages would disappear and AI responses would appear duplicated.

**Root Cause**: Message IDs were generated using `Date.now().toString()`. When two messages were added in quick succession (<1ms) - the user message and the assistant placeholder - they got the SAME ID:
```typescript
// ❌ Can collide if called within same millisecond
const addMessage = (message) => {
  const id = Date.now().toString();  // Both get "1701450000000"!
  setMessages(prev => [...prev, { ...message, id }]);
};
```

React uses keys to track elements. When two elements have the same key, React thinks they're the same element and replaces one with the other instead of keeping both.

**Solution**: Use a unique ID generator that includes a counter and random string:
```typescript
// ✅ Guaranteed unique even if called in same millisecond
let messageCounter = 0;
function generateUniqueId(): string {
  messageCounter += 1;
  return `msg-${Date.now()}-${messageCounter}-${Math.random().toString(36).slice(2, 7)}`;
}

const addMessage = (message) => {
  const id = generateUniqueId();  // "msg-1701450000000-1-a3kx9"
  setMessages(prev => [...prev, { ...message, id }]);
};
```

**Context**: Common issue in React apps where items are added rapidly. Always use unique identifiers - consider libraries like `uuid` or `nanoid` for production, or include a counter/random component.

---

## Learning 023: LangGraph SDK Streaming Sends Duplicate Events

**Date**: 2024-12-01

**Issue**: AI chat responses were appearing twice. The response would stream in, then get erased, then appear again (doubled).

**Root Cause**: When using LangGraph SDK with `streamMode: "messages"`, the SDK sends TWO types of events:
1. `messages/partial` - Incremental content as it streams (accumulative)
2. `messages/complete` - The FULL message again when streaming completes

If you process both events, you'll send duplicate content to the frontend.

**Solution**: Skip `messages/complete` events and only process `messages/partial`:
```typescript
for await (const chunk of streamResponse) {
  const event = chunk.event;
  const data = chunk.data;

  // ❌ Don't process this - it's the full message again
  if (event === "messages/complete") {
    continue;
  }

  // ✅ Process partial events only
  if (Array.isArray(data)) {
    for (const msg of data) {
      if (msgType === "ai" && typeof content === "string") {
        // Track what we've sent to avoid duplication
        if (content.length > lastSentLength) {
          const newContent = content.slice(lastSentLength);
          lastSentLength = content.length;
          send("text", newContent);
        }
      }
    }
  }
}
```

**Context**: LangGraph SDK's `streamMode: "messages"` is designed to give you both incremental updates AND a final complete message. For streaming UIs, you typically only want the incremental updates. The `messages/complete` event is useful if you need to verify the final state but shouldn't be used for streaming display.

---

## Learning 022: Meta API Insights Require Explicit Entity ID Fields

**Date**: 2024-12-01

**Issue**: Dashboard campaign table was showing "—" for metrics (spend, impressions, clicks) even though the API was returning insights data when called with `level: "campaign"`.

**Root Cause**: When using the Meta Marketing API's insights endpoint with `level` parameter (e.g., `level=campaign`), the API returns breakdown data but does NOT include `campaign_id` in the response unless you explicitly request it in the `fields` parameter:
```typescript
// ❌ Returns insights but without campaign_id - can't map to campaigns!
GET /v21.0/act_123/insights?level=campaign&fields=spend,impressions,clicks

// ✅ Returns insights WITH campaign_id for mapping
GET /v21.0/act_123/insights?level=campaign&fields=campaign_id,campaign_name,spend,impressions,clicks
```

**Solution**: Dynamically include entity IDs based on the level parameter:
```typescript
let fields = "date_start,date_stop,impressions,clicks,spend,cpm,cpc,ctr,...";

if (options.level === "campaign") {
  fields = "campaign_id,campaign_name," + fields;
} else if (options.level === "adset") {
  fields = "adset_id,adset_name,campaign_id," + fields;
} else if (options.level === "ad") {
  fields = "ad_id,ad_name,adset_id,campaign_id," + fields;
}
```

**Context**: This is essential when fetching insights at different levels and needing to map them back to their parent entities. The `level` parameter breaks down the data but doesn't automatically include the entity ID that identifies each row.

---

## Learning 021: Supabase .single() Can Cause Server Errors During Async Operations

**Date**: 2024-11-30

**Issue**: Account switching was causing 500 errors. The server action deleted old connections and inserted new ones, but the layout would fail to render.

**Root Cause**: The layout used `.single()` which throws an error if 0 or multiple rows are found:
```typescript
// ❌ Throws error if 0 rows exist
const { data } = await supabase
  .from("meta_connections")
  .select("*")
  .eq("user_id", user.id)
  .single();  // PGRST116 error if no rows!
```

During the brief window between delete and insert operations, the layout might re-render and find 0 rows.

**Solution**: Use `.maybeSingle()` with `.order().limit(1)` for graceful handling:
```typescript
// ✅ Returns null if no rows, no error
const { data } = await supabase
  .from("meta_connections")
  .select("*")
  .eq("user_id", user.id)
  .order("updated_at", { ascending: false })
  .limit(1)
  .maybeSingle();
```

**Context**: Always prefer `.maybeSingle()` over `.single()` when 0 rows is a valid state. Essential for any data that can be deleted/recreated.

---

## Learning 020: LangGraph Cloud - Must Wait for Redeploy After GitHub Push

**Date**: 2024-11-29

**Issue**: After pushing code changes to GitHub, the LangGraph Cloud deployment was still using old code.

**Root Cause**: LangGraph Cloud doesn't auto-deploy instantly on GitHub pushes. There's a build → deploy pipeline that takes 3-10 minutes. The UI may show "Building" or "Deploying Agent Server" for several minutes.

**Solution**: 
1. After `git push`, go to smith.langchain.com → Deployments → Your Deployment → Revisions tab
2. Wait for new revision to show status "Building" → "Deploying Agent Server" → "Currently deployed"
3. If revision gets stuck, check Build Logs and Server Logs for errors
4. If there's an error, fix the code, push again, and a new revision will queue

**Key Insight**: Revisions are processed sequentially. If one is "Deploying", the next is "Queued".

**Context**: Critical workflow - always verify the correct commit is deployed before testing.

---

## Learning 019: LangGraph Cloud - Zod .default() Not Supported by OpenAI

**Date**: 2024-11-29

**Issue**: Server logs showed warnings: `Zod field uses .optional() without .nullable() which is not supported by the API`

**Root Cause**: OpenAI's structured outputs don't support Zod's `.default()` modifier:
```typescript
// ❌ Not supported by OpenAI
datePreset: z.enum(["today", "yesterday", "last_7d"]).default("last_7d")
```

**Solution**: Use `.optional().nullable()` and provide fallback in function body:
```typescript
// ✅ OpenAI compatible
schema: z.object({
  datePreset: z.enum(["today", "yesterday", "last_7d"]).optional().nullable(),
}),
// Function handles default
const result = await client.getInsights(accountId, datePreset || "last_7d");
```

**Context**: This is currently a warning but will become an error in future SDK versions.

---

## Learning 018: LangGraph SDK Requires Explicit Thread Creation

**Date**: 2024-11-29

**Issue**: LangGraph Cloud was responding with "I processed your request but didn't generate a response" - empty AI content.

**Root Cause**: The LangGraph SDK `client.runs.stream()` requires a valid LangGraph thread ID, NOT a Supabase conversation ID. Using a random UUID or Supabase ID doesn't work:
```typescript
// ❌ Wrong - Using Supabase conversation ID
const stream = client.runs.stream(supabaseConversationId, graphName, {...});
```

**Solution**: Explicitly create a LangGraph thread and store the mapping:
```typescript
// ✅ Correct - Create LangGraph thread first
const newThread = await client.threads.create();
const langGraphThreadId = newThread.thread_id;

// Store mapping in Supabase
await supabase.from("conversations")
  .update({ langgraph_thread_id: langGraphThreadId })
  .eq("id", conversationId);

// Use LangGraph thread ID for streaming
const stream = client.runs.stream(langGraphThreadId, graphName, {...});
```

**Context**: Essential for LangGraph Cloud - threads must be created via the SDK.

---

## Learning 017: Meta Marketing API Requires 'act_' Prefix on Account IDs

**Date**: 2024-11-29

**Issue**: LangGraph agent returned error "Object with ID '45558046' does not exist" when calling `getCampaigns`.

**Root Cause**: The Meta Marketing API requires ad account IDs to be prefixed with `act_`:
```typescript
// ❌ Won't work
GET /v21.0/45558046/campaigns

// ✅ Works
GET /v21.0/act_45558046/campaigns
```

**Solution**: Normalize account IDs in tool functions:
```typescript
const getCampaigns = tool(async ({ accountId }) => {
  const normalizedId = accountId.startsWith("act_") 
    ? accountId 
    : `act_${accountId}`;
  return client.getCampaigns(normalizedId);
});
```

**Context**: Always prefix ad account IDs with `act_` before Meta API calls.

---

## Learning 016: LangGraph Cloud Development Tier Has No Database

**Date**: 2024-11-29

**Issue**: LangGraph Cloud deployment failed with `psycopg_pool.PoolTimeout: pool initialization incomplete after 30.0 sec` and DNS resolution errors.

**Root Cause**: The "Development" tier of LangGraph Cloud does NOT include a managed Postgres database. The runtime tried to connect to a non-existent database:
```
failed to resolve host 'lg-xxx.xxx.svc.cluster.local': Name or service not known
```

**Solution**: Use the **Production tier** which includes a managed Postgres database for checkpointing.

**Alternative (not recommended)**: For Development tier, you could try adding `"store": false` to `langgraph.json`, but this disables persistence which defeats the purpose.

**Context**: LangGraph Cloud has two tiers:
- **Development**: No database, limited features, for testing only
- **Production**: Managed Postgres, full features, for real deployments

---

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
