# Project Context: Meta Ads AI Agent

## Product Vision

A conversational AI agent that acts as a virtual media buyer. Users connect their Meta Ads account and chat with the AI to manage campaigns, get insights, and optimize performance - no dashboard complexity, just natural conversation.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15 + Tailwind CSS + shadcn/ui |
| **Backend** | Next.js API Routes + Supabase |
| **AI Agent** | LangGraph.js 1.0 + Claude 3.5 Sonnet |
| **Database** | Supabase PostgreSQL + RLS |
| **Auth** | Supabase Auth + Meta OAuth |
| **Payments** | Stripe |
| **Deployment** | Vercel |

## Why LangGraph.js?

- **Durable execution** - Workflows survive server restarts
- **Human-in-the-loop** - Confirmation for dangerous actions (pause campaigns, change budgets)
- **Checkpointing** - Full conversation state persistence
- **Graph-based** - Complex multi-step workflows
- **Enterprise-ready** - Used by Uber, LinkedIn, Klarna

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Next.js 15                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Chat UI   │  │  Dashboard  │  │   Auth/Onboarding   │ │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         │                │                     │            │
│  ┌──────▼─────────────────▼─────────────────────▼────────┐  │
│  │                 API Routes (streaming)                │  │
│  └──────────────────────────┬────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                    LangGraph Agent                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Claude    │  │    Tools    │  │   PostgresSaver     │ │
│  │   3.5       │◄─►│  (25+ Meta │  │   (Checkpoints)     │ │
│  │   Sonnet    │  │   Actions)  │  │                     │ │
│  └─────────────┘  └──────┬──────┘  └──────────┬──────────┘ │
└──────────────────────────┼────────────────────┼─────────────┘
                           │                    │
┌──────────────────────────▼────────────────────▼─────────────┐
│                      Supabase                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │    Auth     │  │  Database   │  │     Realtime        │ │
│  │  (+ Meta    │  │  (RLS +     │  │   (Live updates)    │ │
│  │   OAuth)    │  │  Encrypted) │  │                     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                   Meta Marketing API                        │
│  Campaigns • Ad Sets • Ads • Insights • Audiences • Creative│
└─────────────────────────────────────────────────────────────┘
```

## Core Features (MVP)

1. **Authentication & Onboarding**
   - Email/password + social login
   - Meta Ads OAuth connection
   - Encrypted token storage

2. **Conversational AI**
   - Natural language campaign management
   - Streaming responses
   - Conversation history

3. **Meta Ads Tools** (25+)
   - Account management
   - Campaign CRUD
   - Budget optimization
   - Performance insights
   - Audience targeting

4. **Human-in-the-Loop**
   - Confirmation for destructive actions
   - Budget change approval
   - Campaign status changes

5. **Dashboard**
   - Account overview
   - Quick stats
   - Recent activity

## Database Schema (Key Tables)

- `users` - User profiles
- `meta_connections` - OAuth tokens (encrypted)
- `conversations` - Chat threads
- `messages` - Chat messages
- `langgraph_checkpoints` - Agent state persistence
- `subscriptions` - Stripe billing

## File Structure

```
meta saas/
├── .cursor/rules/          # AI rules
├── docs/                   # Project documentation
├── app/                    # Next.js pages
│   ├── (auth)/            # Auth routes
│   ├── (dashboard)/       # Protected routes
│   └── api/               # API endpoints
├── components/            # React components
│   ├── ui/               # shadcn/ui
│   ├── chat/             # Chat components
│   └── dashboard/        # Dashboard components
├── lib/                   # Utilities
│   ├── supabase/         # DB client
│   ├── langgraph/        # Agent
│   ├── meta/             # Meta API
│   └── tools/            # LangGraph tools
└── types/                 # TypeScript types
```

## Key Decisions

See `docs/DECISIONS.md` for full decision log.
