# Environment Variables Setup

Create a `.env.local` file in the project root with the following variables:

```bash
# =============================================================================
# META ADS AI AGENT - Environment Configuration
# =============================================================================

# -----------------------------------------------------------------------------
# SUPABASE CONFIGURATION
# -----------------------------------------------------------------------------
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# -----------------------------------------------------------------------------
# META/FACEBOOK ADS API CONFIGURATION
# -----------------------------------------------------------------------------
META_ACCESS_TOKEN=your_meta_access_token
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
META_AD_ACCOUNT_ID=act_your_account_id
META_API_VERSION=v21.0

# -----------------------------------------------------------------------------
# AI MODEL CONFIGURATION
# -----------------------------------------------------------------------------
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# -----------------------------------------------------------------------------
# LANGSMITH TRACING & OBSERVABILITY
# -----------------------------------------------------------------------------
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_langchain_api_key
LANGSMITH_API_KEY=your_langsmith_api_key
LANGCHAIN_PROJECT=YourProjectName
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com

# -----------------------------------------------------------------------------
# LANGGRAPH DEPLOYMENT
# -----------------------------------------------------------------------------
LANGGRAPH_API_KEY=your_langgraph_api_key
LANGGRAPH_DEPLOYMENT_URL=https://your-deployment.us.langgraph.app

# -----------------------------------------------------------------------------
# APPLICATION SETTINGS
# -----------------------------------------------------------------------------
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

## Quick Setup

1. Copy the template above to `.env.local`
2. Fill in your API keys from:
   - **Supabase**: https://supabase.com/dashboard
   - **Meta/Facebook**: https://developers.facebook.com
   - **OpenAI**: https://platform.openai.com/api-keys
   - **LangSmith**: https://smith.langchain.com

## Notes

- Meta access tokens expire after 60 days - refresh via OAuth if needed
- LangSmith tracing helps debug agent execution
- For production, set these in your deployment platform (Vercel, etc.)
