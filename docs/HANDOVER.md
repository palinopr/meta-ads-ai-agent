# Handover Document

## Last Session Summary (Nov 29, 2025) - DEPLOYMENT COMPLETE! 🎉

### What Was Completed

✅ **LangGraph Cloud Migration** - Fully deployed and working!

| Task | Status |
|------|--------|
| Created `graph.ts` for LangGraph Cloud | ✅ Done |
| Updated tools for runtime token | ✅ Done |
| Updated `/api/chat` with SDK client | ✅ Done |
| Pushed to new GitHub repo | ✅ Done |
| Deploy to LangGraph Cloud (Production) | ✅ Done |
| Update Vercel env vars | ✅ Done |
| Deploy to Vercel | ✅ Done |
| Fix `act_` prefix for Meta API account IDs | ✅ Done |
| Fix Zod `.default()` → `.optional().nullable()` | ✅ Done |

### Important Fixes Applied

1. **`act_` Prefix Fix** (commit `aee5a22`)
   - Meta API requires account IDs with `act_` prefix
   - Fixed in `tools.ts`: `getCampaigns` and `getAccountInsights`

2. **Zod Schema Fix** (commit `1cd4c37` - ✅ Currently deployed)
   - OpenAI structured outputs don't support `.default()`
   - Changed to `.optional().nullable()` with runtime fallback

### Deployment Workflow Reminder

⚠️ **IMPORTANT**: After pushing to GitHub, LangGraph Cloud does NOT auto-deploy immediately!
- Go to LangSmith → Deployments → meta-ads-ai-prod → **Wait for build to complete**
- Or click "New Revision" to trigger a new build manually

### Deployment URLs

- **Vercel App**: https://meta-ads-ai-palinos-projects.vercel.app
- **LangGraph Cloud**: https://meta-ads-ai-prod-181ea4f5bba65af69e75dbfc05c3df0d.us.langgraph.app
- **GitHub Repo**: https://github.com/palinopr/meta-ads-ai-agent

### Architecture (Now Working!)

```
User → Vercel /api/chat → LangGraph SDK → LangGraph Cloud → OpenAI + Meta API → No timeout!
```

### Files Created/Modified

```
src/lib/langgraph/graph.ts     - Compiled graph export for LangGraph Cloud
src/lib/langgraph/tools.ts     - Runtime token support (setRuntimeAccessToken)
src/app/api/chat/route.ts      - LangGraph SDK client with streaming
langgraph.json                 - Points to graph.ts:graph
```

---

## Testing the App

1. Go to https://meta-ads-ai-palinos-projects.vercel.app
2. Log in with Meta
3. Ask: "How many active campaigns do I have?"

The agent should now respond WITHOUT timing out!

---

## Key Technical Details

### How Token Passing Works

1. User logs in via Meta OAuth → token stored in `meta_connections` table
2. `/api/chat` reads token from database
3. Token passed to LangGraph Cloud via `config.configurable.access_token` AND `input.accessToken`
4. `graph.ts` reads from state and calls `setRuntimeAccessToken()`
5. Tools use `getClient()` which reads the runtime token

### LangGraph SDK Client Pattern

```typescript
const client = new Client({
  apiUrl: "https://meta-ads-ai-prod-181ea4f5bba65af69e75dbfc05c3df0d.us.langgraph.app",
  apiKey: process.env.LANGCHAIN_API_KEY,
});

const stream = client.runs.stream(threadId, "meta_ads_agent", {
  input: { messages, accessToken, adAccountId, userId },
  config: { configurable: { access_token, ad_account_id } },
  streamMode: "messages",
});
```

---

## Environment Variables

**Vercel** (all set):
- `NEXT_PUBLIC_SUPABASE_URL` ✅
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅
- `META_APP_ID` ✅
- `META_APP_SECRET` ✅
- `OPENAI_API_KEY` ✅
- `LANGCHAIN_API_KEY` ✅
- `LANGGRAPH_DEPLOYMENT_URL` ✅ NEW!

**LangGraph Cloud** (all set):
- `OPENAI_API_KEY` ✅ (auto-pulled from LangSmith)

---

## Key Learnings From This Session

1. **LangGraph Cloud Production tier is required** - Development tier has no database
2. **Must wait for LangGraph Cloud redeploy** after GitHub pushes (3-10 min)
3. **Meta API requires `act_` prefix** on account IDs
4. **Zod `.default()` not supported** by OpenAI - use `.optional().nullable()` instead
5. **LangGraph threads must be explicitly created** via `client.threads.create()`

---

## Troubleshooting Guide

### "I processed your request but didn't generate a response"
- Check if LangGraph thread ID is valid (must be created via SDK)
- Check Server Logs in LangSmith for errors

### "Object with ID 'xxx' does not exist"
- Add `act_` prefix to account IDs
- Verify Meta access token is valid

### Deployment stuck on "Building"
- Check Build Logs for errors
- Fix code and push again - new revision will queue

### Agent not using latest code
- Go to LangSmith → Deployments → Revisions
- Verify correct commit is "Currently deployed"
- If not, wait for build to complete or trigger new revision

---

## Commands Reference

```bash
# Push to GitHub (triggers LangGraph Cloud rebuild)
cd "/Users/jaimeortiz/meta saas" && git add -A && git commit -m "description" && git push

# Redeploy Vercel (for Next.js app changes)
cd "/Users/jaimeortiz/meta saas" && npx vercel --prod --yes

# Check Vercel env vars
npx vercel env ls

# Test locally
npm run dev
```

---

## URLs Quick Reference

| Service | URL |
|---------|-----|
| Vercel App | https://meta-ads-ai-palinos-projects.vercel.app |
| LangGraph Cloud Dashboard | https://smith.langchain.com/o/d46348af-8871-4fc1-bb27-5d17f0589bd5/host/deployments/00ab876d-be2d-48a3-80a4-0c620b0e83c4 |
| GitHub Repo | https://github.com/palinopr/meta-ads-ai-agent |
