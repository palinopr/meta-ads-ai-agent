-- Meta Ads AI Agent - Initial Database Schema
-- Run this migration in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- USERS TABLE (extends Supabase auth.users)
-- ============================================
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (id = (SELECT auth.uid()));

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (id = (SELECT auth.uid()));

-- ============================================
-- META CONNECTIONS TABLE (OAuth tokens)
-- ============================================
CREATE TABLE public.meta_connections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  access_token TEXT NOT NULL, -- Encrypted at application level
  token_expires_at TIMESTAMPTZ NOT NULL,
  ad_account_id TEXT NOT NULL,
  ad_account_name TEXT,
  business_id TEXT,
  business_name TEXT,
  scopes TEXT[], -- Array of granted permissions
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(user_id, ad_account_id)
);

-- Enable RLS
ALTER TABLE public.meta_connections ENABLE ROW LEVEL SECURITY;

-- Users can only access their own connections
CREATE POLICY "Users can view own connections" ON public.meta_connections
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own connections" ON public.meta_connections
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own connections" ON public.meta_connections
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own connections" ON public.meta_connections
  FOR DELETE USING (user_id = (SELECT auth.uid()));

-- ============================================
-- CONVERSATIONS TABLE (Chat threads)
-- ============================================
CREATE TABLE public.conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT DEFAULT 'New Conversation' NOT NULL,
  meta_connection_id UUID REFERENCES public.meta_connections(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Users can only access their own conversations
CREATE POLICY "Users can view own conversations" ON public.conversations
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own conversations" ON public.conversations
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own conversations" ON public.conversations
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own conversations" ON public.conversations
  FOR DELETE USING (user_id = (SELECT auth.uid()));

-- ============================================
-- MESSAGES TABLE (Chat messages)
-- ============================================
CREATE TABLE public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  tool_calls JSONB, -- Store tool call info
  tool_call_id TEXT, -- For tool response messages
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can only access messages in their own conversations
CREATE POLICY "Users can view messages in own conversations" ON public.messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM public.conversations WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can insert messages in own conversations" ON public.messages
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.conversations WHERE user_id = (SELECT auth.uid())
    )
  );

-- ============================================
-- SUBSCRIPTIONS TABLE (Stripe billing)
-- ============================================
CREATE TABLE public.subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (
    status IN ('trialing', 'active', 'canceled', 'incomplete', 'past_due')
  ),
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only view their own subscription
CREATE POLICY "Users can view own subscription" ON public.subscriptions
  FOR SELECT USING (user_id = (SELECT auth.uid()));

-- ============================================
-- LANGGRAPH CHECKPOINTS TABLE
-- ============================================
-- This table is used by LangGraph's PostgresSaver
-- for persisting agent state between interactions

CREATE TABLE public.langgraph_checkpoints (
  thread_id TEXT NOT NULL,
  checkpoint_ns TEXT NOT NULL DEFAULT '',
  checkpoint_id TEXT NOT NULL,
  parent_checkpoint_id TEXT,
  type TEXT,
  checkpoint JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id)
);

-- Writes table for streaming
CREATE TABLE public.langgraph_writes (
  thread_id TEXT NOT NULL,
  checkpoint_ns TEXT NOT NULL DEFAULT '',
  checkpoint_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  idx INT NOT NULL,
  channel TEXT NOT NULL,
  type TEXT,
  value JSONB,
  
  PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
);

-- Enable RLS (checkpoints are linked to conversations/users through thread_id)
ALTER TABLE public.langgraph_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.langgraph_writes ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies for checkpoints will be based on thread_id matching conversation_id
-- which is owned by the user
CREATE POLICY "Users can access own checkpoints" ON public.langgraph_checkpoints
  FOR ALL USING (
    thread_id IN (
      SELECT id::text FROM public.conversations WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can access own writes" ON public.langgraph_writes
  FOR ALL USING (
    thread_id IN (
      SELECT id::text FROM public.conversations WHERE user_id = (SELECT auth.uid())
    )
  );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- Also create a free subscription
  INSERT INTO public.subscriptions (user_id, status, plan)
  VALUES (NEW.id, 'trialing', 'free');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meta_connections_updated_at
  BEFORE UPDATE ON public.meta_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_meta_connections_user_id ON public.meta_connections(user_id);
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);
CREATE INDEX idx_langgraph_checkpoints_thread_id ON public.langgraph_checkpoints(thread_id);

