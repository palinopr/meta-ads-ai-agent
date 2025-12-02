# Code Review Guide - Meta Ads AI Agent

## Purpose
This document helps you (and AI assistants) understand the entire codebase structure and maintain context across conversations.

## How Context is Maintained

### 1. **Documentation Files** (`docs/` directory)
These files preserve context between AI chat sessions:

- **`PROJECT_CONTEXT.md`** - High-level architecture, vision, tech stack
- **`CURRENT_TASK.md`** - What's actively being worked on (updated after each task)
- **`HANDOVER.md`** - Last session summary, next steps, blockers
- **`DECISIONS.md`** - All technical decisions and rationale
- **`LEARNINGS.md`** - Gotchas, bugs, solutions discovered
- **`PROGRESS.md`** - Historical log of completed work
- **`CODE_REVIEW.md`** - This file - codebase structure guide

### 2. **Cursor Rules** (`.cursor/rules/project.mdc`)
- Enforces context reading at start of every chat
- Defines coding standards and patterns
- Ensures documentation updates after tasks

### 3. **How to Use This Guide**

**Before starting a new task:**
1. Read `docs/CURRENT_TASK.md` - See what's in progress
2. Read `docs/HANDOVER.md` - Get context from last session
3. Read `docs/DECISIONS.md` - Understand past choices
4. Read `docs/LEARNINGS.md` - Avoid known pitfalls

**When reviewing code:**
1. Use this guide to understand file structure
2. Check `docs/LEARNINGS.md` for known issues
3. Review `docs/DECISIONS.md` for architectural patterns

---

## Codebase Structure

### Core Application Files

#### **Frontend (Next.js 15 App Router)**

```
src/app/
├── (auth)/                    # Public auth routes
│   ├── auth/callback/        # OAuth callback handler
│   └── login/                # Login page + actions
│
├── (dashboard)/               # Protected routes (require auth)
│   ├── chat/                 # AI chat interface
│   ├── dashboard/            # Main dashboard page
│   └── onboarding/          # Account connection flow
│
└── api/                      # API Routes
    ├── auth/meta/            # Meta OAuth flow
    ├── chat/                 # LangGraph agent endpoint
    └── meta/                 # Meta API proxies
        ├── campaigns/        # Campaign CRUD + insights
        ├── adsets/          # Ad set CRUD + insights
        └── ads/             # Ad CRUD + insights
```

**Key Files:**
- `src/app/(dashboard)/dashboard/page.tsx` - Main dashboard (server component)
- `src/app/api/chat/route.ts` - LangGraph agent streaming endpoint
- `src/app/api/meta/campaigns/route.ts` - Campaign insights with pagination

#### **Components**

```
src/components/
├── ai-assistant/             # AI chat components
│   ├── AIChat.tsx           # Main chat UI
│   ├── AssistantProvider.tsx # Chat state management
│   └── ChatPanel.tsx        # Message display
│
├── dashboard/                # Dashboard components
│   ├── MetaAdsTable.tsx     # Main campaigns/adsets/ads table
│   ├── CampaignTable.tsx    # (Legacy - being replaced)
│   └── AdsDataTable.tsx     # (Legacy - being replaced)
│
├── layout/                   # Layout components
│   ├── DashboardLayoutClient.tsx # Main layout wrapper
│   ├── ModernSidebar.tsx    # Left navigation sidebar
│   └── ModernAccountSwitcher.tsx # Account switcher dropdown
│
└── ui/                       # shadcn/ui components
    ├── button.tsx
    ├── card.tsx
    └── ...
```

**Key Files:**
- `src/components/dashboard/MetaAdsTable.tsx` - Main dashboard table (2000+ lines)
  - Handles campaigns/adsets/ads drill-down
  - Date range selection
  - Status filtering
  - Column visibility
  - Pagination (client-side)

#### **Libraries**

```
src/lib/
├── meta/                     # Meta Marketing API client
│   ├── client.ts            # MetaAdsClient class (600+ lines)
│   └── config.ts            # API configuration
│
├── langgraph/                # LangGraph agent (deployed to LangGraph Cloud)
│   ├── agent.ts             # Agent definition
│   ├── graph.ts             # Graph compilation
│   └── tools.ts             # Meta Ads tools (25+ tools)
│
└── supabase/                 # Supabase client helpers
    ├── client.ts            # Browser client
    ├── server.ts            # Server client
    └── middleware.ts       # Auth middleware
```

**Key Files:**
- `src/lib/meta/client.ts` - Meta API client with pagination
  - `getAccountInsights()` - Fetches all pages of insights
  - `getCampaigns()` - Fetches campaigns with effective_status
  - All CRUD operations for campaigns/adsets/ads

- `src/lib/langgraph/` - AI agent code
  - Deployed separately to LangGraph Cloud
  - Uses separate GitHub repo: `palinopr/meta-ads-ai-agent`

#### **Types**

```
src/types/
└── index.ts                  # TypeScript type definitions
    - Campaign, AdSet, Ad
    - AdInsights
    - AdAccount
    - CampaignRow, AdSetRow, AdRow (for table)
```

---

## Critical Code Patterns

### 1. **Meta API Pagination** (CRITICAL)
**Location**: `src/lib/meta/client.ts` → `getAccountInsights()`

**Pattern**: Meta Insights API paginates results. Always fetch all pages:
```typescript
// ✅ CORRECT - Fetches all pages
while (requestUrl && pageCount < maxPages) {
  const result = await fetch(requestUrl);
  allInsights.push(...result.data);
  requestUrl = result.paging?.next || null;
}
```

**Why**: Maximum date range returns hundreds/thousands of records across multiple pages.

### 2. **Insight Aggregation**
**Location**: `src/app/api/meta/campaigns/route.ts`

**Pattern**: Meta can return multiple insight rows per campaign (date breakdowns). Aggregate them:
```typescript
// ✅ CORRECT - Aggregates multiple rows
if (existing) {
  insightsMap.set(campaignId, {
    spend: (existingSpend + newSpend).toFixed(2),
    impressions: (existingImpressions + newImpressions).toString(),
    // ... aggregate all metrics
  });
}
```

### 3. **Account ID Normalization**
**Location**: Multiple files

**Pattern**: Always prefix account IDs with `act_`:
```typescript
// ✅ CORRECT
accountId = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
```

### 4. **Date Range Handling**
**Location**: `src/app/api/meta/campaigns/route.ts`

**Pattern**: "Maximum" uses `time_range` (2 years), others use `date_preset`:
```typescript
if (isMaximum) {
  insightOptions.time_range = {
    since: twoYearsAgo.toISOString().split('T')[0],
    until: today.toISOString().split('T')[0]
  };
} else {
  insightOptions.date_preset = datePreset;
}
```

### 5. **Effective Status Display**
**Location**: `src/components/dashboard/MetaAdsTable.tsx`

**Pattern**: Show `effective_status` (actual delivery) not just `status` (configured):
```typescript
// ✅ Shows why ACTIVE campaign isn't delivering
const effectiveStatus = campaign.effective_status;
// PENDING_REVIEW, WITH_ISSUES, etc.
```

---

## Common Issues & Solutions

### Issue: Active campaigns show no data
**Solution**: Check `effective_status` - campaign might be PENDING_REVIEW or WITH_ISSUES
**Files**: `src/lib/meta/client.ts`, `src/components/dashboard/MetaAdsTable.tsx`

### Issue: Maximum date range returns no data
**Solution**: Ensure pagination fetches ALL pages, not just first page
**Files**: `src/lib/meta/client.ts` → `getAccountInsights()`

### Issue: Insights don't match campaigns
**Solution**: Ensure `campaign_id` is included in insights fields when `level=campaign`
**Files**: `src/lib/meta/client.ts` → `getAccountInsights()`

### Issue: Date range mismatch on page refresh
**Solution**: Auto-fetch on mount if saved date range differs from server default
**Files**: `src/components/dashboard/MetaAdsTable.tsx` → `useEffect` with `initialFetchDone`

---

## Testing Checklist

When reviewing code changes, verify:

- [ ] **Pagination**: Does it fetch all pages for Maximum date range?
- [ ] **Aggregation**: Are multiple insight rows per campaign aggregated?
- [ ] **Account IDs**: Are they normalized with `act_` prefix?
- [ ] **Date ranges**: Does Maximum use `time_range`, others use `date_preset`?
- [ ] **Error handling**: Are errors logged and partial results returned?
- [ ] **TypeScript**: No `any` types, proper type safety
- [ ] **Documentation**: Are docs updated after changes?

---

## Key URLs

- **Production**: https://meta-ads-ai-palinos-projects.vercel.app
- **LangGraph Cloud**: https://smith.langchain.com
- **GitHub Repo**: https://github.com/palinopr/meta-ads-ai-agent (LangGraph agent)
- **Meta API Docs**: https://developers.facebook.com/docs/marketing-apis

---

## File Size Reference

**Large Files** (may need refactoring):
- `src/components/dashboard/MetaAdsTable.tsx` - ~2000 lines (main dashboard)
- `src/lib/meta/client.ts` - ~650 lines (Meta API client)
- `src/lib/langgraph/tools.ts` - ~500+ lines (25+ tools)

**Medium Files**:
- `src/app/api/meta/campaigns/route.ts` - ~380 lines
- `src/components/ai-assistant/AIChat.tsx` - ~300+ lines

---

## Quick Reference: Where Things Are

| Feature | File Location |
|---------|---------------|
| Campaign insights API | `src/app/api/meta/campaigns/route.ts` |
| Meta API client | `src/lib/meta/client.ts` |
| Dashboard table | `src/components/dashboard/MetaAdsTable.tsx` |
| AI chat endpoint | `src/app/api/chat/route.ts` |
| LangGraph agent | `src/lib/langgraph/` (deployed separately) |
| Auth middleware | `src/middleware.ts` |
| Type definitions | `src/types/index.ts` |
| Supabase client | `src/lib/supabase/` |

---

## Context Preservation Protocol

**At Start of Chat:**
1. AI reads: `PROJECT_CONTEXT.md`, `CURRENT_TASK.md`, `HANDOVER.md`, `DECISIONS.md`, `LEARNINGS.md`
2. AI announces: "I've read the context files. Continuing from [task]..."

**During Work:**
- Update `CURRENT_TASK.md` when starting new task
- Update `HANDOVER.md` after completing task
- Log decisions in `DECISIONS.md`
- Log gotchas in `LEARNINGS.md`

**At End of Chat:**
- Update `HANDOVER.md` with full summary
- Mark tasks complete in `CURRENT_TASK.md`
- Deploy to Vercel if code changed

---

## How to Review This Codebase

1. **Start with docs**: Read `PROJECT_CONTEXT.md` for architecture overview
2. **Check current work**: Read `CURRENT_TASK.md` for active tasks
3. **Review recent changes**: Check `HANDOVER.md` for last session
4. **Understand decisions**: Read `DECISIONS.md` for architectural choices
5. **Avoid pitfalls**: Read `LEARNINGS.md` for known issues
6. **Use this guide**: Reference this file for file locations and patterns

---

**Last Updated**: Dec 1, 2025
**Maintained By**: AI Assistant + Developer

