# Setup Guide

## Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase account (free tier works)
- Meta Developer account (for ads API)

## 1. Install Dependencies

```bash
cd "/Users/jaimeortiz/meta saas"
npm install
```

## 2. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key from Settings > API

## 3. Set Up Environment Variables

Create a `.env.local` file in the project root:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Meta Ads API (optional for now)
META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret

# AI (add when implementing agent)
ANTHROPIC_API_KEY=your-anthropic-key
```

## 4. Run Database Migration

1. Go to your Supabase dashboard > SQL Editor
2. Copy the contents of `supabase/migrations/00001_initial_schema.sql`
3. Run the SQL to create all tables and policies

## 5. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000` (or 3001 if 3000 is in use).

## 6. Configure Meta App (Optional)

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create a new app (Business type)
3. Add the Marketing API product
4. Get your App ID and App Secret
5. Add them to `.env.local`

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure `.env.local` exists with the correct values
- Restart the dev server after adding env vars

### Port already in use
- The app will automatically try port 3001
- Or kill the process: `lsof -ti:3000 | xargs kill`

### Database errors
- Make sure you ran the migration SQL
- Check that RLS policies are enabled

