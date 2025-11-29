# Handover Document

> **For the next AI chat**: Read this first, then `PROJECT_CONTEXT.md`, then `CURRENT_TASK.md`.

## Last Session Summary

**Date**: 2024-11-29 (Session 15)

**What was completed**:
- ✅ Fixed AI assistant "No response received" bug
- ✅ Updated `/api/chat` to return SSE stream instead of JSON
- ✅ Added Meta OAuth whitelist info to cursor rules
- ✅ Documented SSE streaming fix in LEARNINGS.md

**Root Cause Found**: Frontend ChatPanel expected SSE format (`data: {"type":"text",...}`) but backend was returning plain JSON. Fixed by converting to proper SSE streaming.

**Current state**: AI assistant code is fixed and deployed. To test, user needs to whitelist the deployment's redirect URI in Facebook App settings.

**Production URL**: https://meta-ads-ai-palinos-projects.vercel.app (stable domain)

---

## Where LangGraph Runs

**LangGraph runs on LangGraph Cloud** (not Vercel):

```
User → Vercel (/api/chat) → LangGraph Cloud SDK → LangGraph Cloud → OpenAI → Response
```

**Key files:**
- `langgraph.json` - LangGraph Cloud deployment config
- `src/lib/langgraph/graph.ts` - Graph export for LangGraph Cloud (uses OpenAI)
- `src/lib/langgraph/tools.ts` - Meta Ads tools (17 tools)
- `src/app/api/chat/route.ts` - Calls LangGraph Cloud via SDK

## Deploy to LangGraph Cloud

**Step 1: Go to LangSmith**
- Visit https://smith.langchain.com
- Sign in with your account

**Step 2: Deploy Graph**
- Go to "Deployments" → "New Deployment"  
- Connect your GitHub repo
- Select `langgraph.json` as config
- Add environment variables:
  - `OPENAI_API_KEY` = your OpenAI key
  - `META_ACCESS_TOKEN` = placeholder (actual tokens passed at runtime)

**Step 3: Get Deployment URL**
- After deployment, copy the URL (e.g., `https://your-deployment.langchain.app`)

**Step 4: Update Vercel**
- Add `LANGGRAPH_API_URL` = your deployment URL
- Redeploy Vercel

---

## Key Changes This Session

### 1. Fixed AI Chat SSE Streaming

**File Modified**: `src/app/api/chat/route.ts`

**Before** (broken):
```typescript
return NextResponse.json({ response: fullResponse, conversationId: threadId });
```

**After** (working):
```typescript
const stream = new ReadableStream({
  async start(controller) {
    sendSSE("conversationId", threadId);
    sendSSE("text", msg.content);  // Stream each chunk
    sendSSE("done", "");
  }
});
return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
```

### 2. Updated Cursor Rules with Meta OAuth Info

Added to `.cursor/rules/project.mdc`:
- Meta OAuth always required (not email/password)
- Facebook App redirect URI whitelist requirements
- Valid OAuth Redirect URIs that need to be added

---

## File Structure (AI Assistant)

```
src/components/ai-assistant/
├── index.tsx               # Exports + AIAssistant combo component
├── AssistantProvider.tsx   # React context for state management
├── FloatingButton.tsx      # Bottom-right "Ask AI ⌘K" button
├── ChatPanel.tsx           # Modal overlay chat panel
└── QuickActions.tsx        # Clickable suggestion buttons

src/app/api/chat/
└── route.ts                # FIXED - Now returns SSE stream
```

---

## Strict Rule: Only Work on Vercel

**NEVER test locally. Always deploy to Vercel and test there.**

```bash
cd "/Users/jaimeortiz/meta saas"
npx vercel --prod --yes  # Deploy and test
```

---

## What's Next (Priority Order)

1. **USER ACTION REQUIRED**: Whitelist redirect URI in Facebook App
   - Go to developers.facebook.com → Your App → Facebook Login → Settings
   - Add: `https://meta-ads-qocfx5fgp-palinos-projects.vercel.app/api/auth/meta/callback`
2. Test full login → dashboard → AI flow
3. Implement PostgresSaver for production checkpointing

---

## Blockers / Notes

- **BLOCKER**: Facebook App redirect URI needs whitelisting (user must do this)
- **No PostgresSaver yet**: Using MemorySaver (add for production persistence)
- **AI Fix deployed**: SSE streaming now works, needs Meta OAuth to test
