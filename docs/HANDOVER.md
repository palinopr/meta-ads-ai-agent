# Handover Document

## Last Session Summary (Nov 29, 2025)

### What Was Completed

✅ **LangGraph Cloud Migration** - Major architecture change to fix timeout issues

| Task | Status |
|------|--------|
| Created `graph.ts` for LangGraph Cloud | ✅ Done |
| Updated tools for runtime token | ✅ Done |
| Updated `/api/chat` with SDK client | ✅ Done |
| Pushed to new GitHub repo | ✅ Done |
| Deploy to LangGraph Cloud | 🔄 User action needed |
| Update Vercel env vars | ⏳ Pending |

### New GitHub Repository

**https://github.com/palinopr/meta-ads-ai-agent**

(Old repo had git issues with parent directory - created fresh repo)

### Architecture Change

**Before (broken):**
```
User → Vercel /api/chat → [LangGraph + OpenAI + Meta API IN VERCEL] → 60s TIMEOUT!
```

**After (correct):**
```
User → Vercel /api/chat → LangGraph SDK → LangGraph Cloud → OpenAI + Meta API → No timeout!
```

### Files Created/Modified

```
src/lib/langgraph/graph.ts     - NEW: Compiled graph export for LangGraph Cloud
src/lib/langgraph/tools.ts     - Added runtime token support (setRuntimeAccessToken)
src/app/api/chat/route.ts      - Replaced local invocation with LangGraph SDK client
langgraph.json                 - Points to graph.ts:graph
.cursor/rules/project.mdc      - Removed secrets (placeholders)
docs/ENV_SETUP.md              - Removed secrets (placeholders)
```

---

## Next Steps (Priority Order)

### 1. Deploy to LangGraph Cloud (USER ACTION REQUIRED)

1. Go to https://smith.langchain.com → Deployments → New Deployment
2. Connect GitHub: `palinopr/meta-ads-ai-agent` (main branch)
3. Add env var: `OPENAI_API_KEY`
4. Deploy and copy the deployment URL

### 2. Update Vercel Environment Variables

After getting LangGraph deployment URL:
```bash
cd "/Users/jaimeortiz/meta saas"
npx vercel env add LANGGRAPH_DEPLOYMENT_URL
# Paste the URL and select all environments
```

### 3. Redeploy Vercel

```bash
cd "/Users/jaimeortiz/meta saas" && npx vercel --prod --yes
```

---

## Key Technical Details

### How Token Passing Works

1. User logs in via Meta OAuth → token stored in `meta_connections` table
2. `/api/chat` reads token from database
3. Token passed to LangGraph Cloud via `config.configurable.access_token`
4. `graph.ts` reads from state and calls `setRuntimeAccessToken()`
5. Tools use `getClient()` which reads the runtime token

### LangGraph SDK Client Pattern

```typescript
const client = new Client({
  apiUrl: LANGGRAPH_DEPLOYMENT_URL,
  apiKey: LANGGRAPH_API_KEY,
});

const stream = client.runs.stream(threadId, "meta_ads_agent", {
  input: { messages, accessToken, adAccountId, userId },
  config: { configurable: { access_token, ad_account_id } },
  streamMode: "messages",
});
```

---

## Blockers / Notes

- **User must manually deploy to LangGraph Cloud** - Cannot be automated
- Secrets were removed from repo (replace with real values in .env.local)
- The original git repo had issues due to parent directory structure - new fresh repo created

---

## Environment Variables Required

On **Vercel**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `META_APP_ID`
- `META_APP_SECRET`
- `OPENAI_API_KEY`
- `LANGGRAPH_API_KEY`
- `LANGGRAPH_DEPLOYMENT_URL` ← **NEEDS TO BE ADDED after LangGraph Cloud deploy**

On **LangGraph Cloud**:
- `OPENAI_API_KEY`

---

## Commands to Run (Next Session)

```bash
# After LangGraph Cloud is deployed:
cd "/Users/jaimeortiz/meta saas"
npx vercel env add LANGGRAPH_DEPLOYMENT_URL
npx vercel --prod --yes

# Test the app
open https://meta-ads-ai-palinos-projects.vercel.app
```
