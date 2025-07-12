# Database Schema Reference

## Overview
This document provides a comprehensive reference for the Voiltail database schema using Supabase (PostgreSQL).

## Core Tables

### user_profiles
Extends BetterAuth users with Voiltail-specific data.

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'active', 'canceled', 'past_due')),
  subscription_id TEXT,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Fields:**
- `id`: Primary key, UUID
- `email`: User's email address (unique)
- `stripe_customer_id`: Stripe customer ID for billing
- `subscription_status`: Current subscription status
- `subscription_id`: Active Stripe subscription ID
- `current_period_end`: When current billing period ends
- `created_at`: Account creation timestamp
- `updated_at`: Last update timestamp

### subscriptions
Tracks subscription history and details.

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### queries
Stores Pro user query history.

```sql
CREATE TABLE queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  analysis JSONB,
  synthesis_type TEXT DEFAULT 'sophisticated' CHECK (synthesis_type IN ('basic', 'sophisticated')),
  processing_time INTEGER, -- in milliseconds
  estimated_cost DECIMAL(10,6), -- in USD
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### usage_tracking
Tracks monthly usage limits and consumption.

```sql
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  queries_used INTEGER DEFAULT 0,
  queries_limit INTEGER DEFAULT 1000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Indexes

Performance indexes for common queries:

```sql
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_stripe_customer ON user_profiles(stripe_customer_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_queries_user_id ON queries(user_id);
CREATE INDEX idx_queries_created_at ON queries(created_at);
CREATE INDEX idx_usage_tracking_user_id ON usage_tracking(user_id);
```

## Row Level Security (RLS)

All tables have RLS enabled with policies ensuring users can only access their own data:

```sql
-- Example policy
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid()::text = id::text);
```

## Common Queries

### Get user with subscription status
```sql
SELECT 
  up.*,
  s.status as subscription_status,
  s.current_period_end
FROM user_profiles up
LEFT JOIN subscriptions s ON up.id = s.user_id
WHERE up.email = $1;
```

### Get user query history
```sql
SELECT 
  prompt,
  synthesis_type,
  processing_time,
  estimated_cost,
  created_at
FROM queries
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 50;
```

### Check usage limits
```sql
SELECT 
  queries_used,
  queries_limit,
  (queries_limit - queries_used) as remaining
FROM usage_tracking
WHERE user_id = $1
  AND period_start <= NOW()
  AND period_end >= NOW();
```

## Migration Scripts

See `docs/phases/PHASE-4-PRODUCTION-SYSTEM.md` for complete migration scripts.
