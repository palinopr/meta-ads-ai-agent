# Technical Decisions Log

## Decision 004: Comprehensive Toolset for Autonomy

**Date**: 2024-11-29

**Decision**: Expand agent from 9 to 17+ tools covering full Meta Ads CRUD operations

**Rationale**:
- User explicitly requested autonomous agent that can "think and do all autonomous"
- Previous 9 tools were limited to read + basic campaign updates
- Full autonomy requires ability to:
  - Create/update/delete ad sets
  - Create/update/delete ads
  - Manage audiences (custom + lookalike)
  - Upload creative assets
  - Modify targeting
  - Configure bidding rules

**Tools Added**:
- `create_ad_set`, `update_ad_set`, `delete_ad_set`
- `create_ad`, `update_ad`, `delete_ad`
- `create_custom_audience`, `create_lookalike_audience`
- `upload_creative_image`, `upload_creative_video`
- `update_ad_targeting`, `set_auto_bidding_rule`

**Safety Consideration**: All write tools require human confirmation via interrupt()

---

## Decision 003: Project Directory

**Date**: 2024-11-29

**Decision**: Use `/Users/jaimeortiz/meta saas/` as project root

**Rationale**:
- User's preferred location
- Already set up as Cursor workspace

---

## Decision 002: Context Engineering System

**Date**: 2024-11-29

**Decision**: Implement dedicated documentation files + Cursor rules

**Rationale**:
- Ensures context transfer between AI chats
- Creates searchable knowledge base
- Enforces research-before-coding behavior
- User explicitly requested handover protocol

**Files Created**:
- `.cursor/rules/project.mdc`
- `docs/PROJECT_CONTEXT.md`
- `docs/CURRENT_TASK.md`
- `docs/DECISIONS.md`
- `docs/LEARNINGS.md`
- `docs/PROGRESS.md`
- `docs/HANDOVER.md`

---

## Decision 001: AI Agent Framework

**Date**: 2024-11-29

**Decision**: Use LangGraph.js 1.0

**Rationale**:
- Durable execution - workflows survive restarts
- Human-in-the-loop built-in for dangerous actions
- PostgresSaver for checkpoint persistence
- Graph-based architecture for complex workflows
- Enterprise adoption (Uber, LinkedIn, Klarna)
- User explicitly requested "big" long-term solution

**Alternatives Considered**:
- Vercel AI SDK - Simpler but less powerful workflow support
- Plain LangChain - No built-in persistence/HIL

---

## Template for New Decisions

```markdown
## Decision XXX: [Title]

**Date**: YYYY-MM-DD

**Decision**: [What was decided]

**Rationale**:
- [Reason 1]
- [Reason 2]

**Alternatives Considered**:
- [Alternative 1] - [Why rejected]
- [Alternative 2] - [Why rejected]
```
