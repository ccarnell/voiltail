# Phase 4: Full Production System

## 🔄 TRIPWIRE CHECKPOINT
*Execute the comprehensive analysis before proceeding with Phase 4.*

## Objective
Complete the production-ready system with authentication, database, monitoring, and email capabilities.

## Success Criteria
- [ ] BetterAuth authentication works seamlessly
- [ ] Supabase database handles all user data
- [ ] Monitoring catches and reports issues
- [ ] Email system handles all user communications
- [ ] Rate limiting prevents abuse
- [ ] System is scalable and maintainable

## User Requirements

### [[[(((XXX!!!NEED USER INPUT HERE!!!XXX)))]]

**Supabase Setup:**
1. Create account at https://supabase.com
2. Create new project
3. Get database URL and keys from project settings
4. Run database migrations (provided below)

**BetterAuth Setup:**
1. No separate signup required - it's an npm package
2. Configuration will be handled in code

**Resend Setup:**
1. Create account at https://resend.com
2. Verify your domain for sending emails
3. Get API key from dashboard

**PostHog Setup:**
1. Create account at https://posthog.com
2. Create new project
3. Get project key and host URL

**Sentry Setup:**
1. Create account at https://sentry.io
2. Create new Next.js project
3. Get DSN from project settings

**Upstash Setup:**
1. Create account at https://upstash.com
2. Create Redis database
3. Get REST URL and token

**Environment Variables Required:**
```env
# Add to .env.local

# Supabase
DATABASE_URL=postgresql://... # From Supabase project settings
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... # From Supabase project settings
SUPABASE_SERVICE_ROLE_KEY=eyJ... # From Supabase project settings

# BetterAuth
BETTER_AUTH_SECRET=your-random-secret-key # Generate with: openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000 # Change to production URL when deploying

# Resend
RESEND_API_KEY=re_... # From Resend dashboard

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=phc_... # From PostHog project
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Sentry
SENTRY_DSN=https://...@sentry.io/... # From Sentry project

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=... # From Upstash dashboard
```

## Implementation Steps

### Step 1: Database Setup (Supabase)

**1.1 Database Schema Migration**
```sql
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends BetterAuth users)
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

-- Subscriptions table
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

-- Queries table (Pro user query history)
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

-- Usage tracking table
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  queries_used INTEGER DEFAULT 0,
  queries_limit INTEGER DEFAULT 1000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_stripe_customer ON user_profiles(stripe_customer_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_queries_user_id ON queries(user_id);
CREATE INDEX idx_queries_created_at ON queries(created_at);
CREATE INDEX idx_usage_tracking_user_id ON usage_tracking(user_id);

-- Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own queries" ON queries
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own queries" ON queries
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own usage" ON usage_tracking
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Step 2: Authentication (BetterAuth)

**2.1 Install Dependencies**
```bash
npm install better-auth @better-auth/next-js
```

**2.2 BetterAuth Configuration**
```typescript
// lib/auth/config.ts
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
  database: {
    provider: "postgresql",
    url: process.env.DATABASE_URL!,
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [nextCookies()],
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.User;
```

**2.3 Auth API Route**
```typescript
// app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth/config";
import { toNextJsHandler } from "better-auth/next-js";

const handler = toNextJsHandler(auth);

export { handler as GET, handler as POST };
```

**2.4 Auth Client**
```typescript
// lib/auth/client.ts
import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;
```

### Step 3: Monitoring Setup

**3.1 Install Monitoring Dependencies**
```bash
npm install @sentry/nextjs posthog-js posthog-node
```

**3.2 Sentry Configuration**
```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [
    new Sentry.BrowserTracing(),
  ],
  tracesSampleRate: 1.0,
  debug: false,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
});

// sentry.server.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
  ],
  tracesSampleRate: 1.0,
  debug: false,
});
```

**3.3 PostHog Configuration**
```typescript
// lib/analytics/posthog.ts
import { PostHog } from 'posthog-node';

export const posthog = new PostHog(
  process.env.NEXT_PUBLIC_POSTHOG_KEY!,
  { 
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0
  }
);

// Client-side PostHog
// lib/analytics/posthog-client.ts
'use client';

import posthog from 'posthog-js';

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    capture_pageview: false // Disable automatic pageview capture
  });
}

export { posthog };

// Analytics hook
export const useAnalytics = () => {
  const trackEvent = (event: string, properties?: Record<string, any>) => {
    if (typeof window !== 'undefined') {
      posthog.capture(event, properties);
    }
  };

  const identifyUser = (userId: string, properties?: Record<string, any>) => {
    if (typeof window !== 'undefined') {
      posthog.identify(userId, properties);
    }
  };

  return { trackEvent, identifyUser };
};
```

### Step 4: Email System (Resend)

**4.1 Install Email Dependencies**
```bash
npm install resend
```

**4.2 Email Configuration**
```typescript
// lib/email/config.ts
import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is not set');
}

export const resend = new Resend(process.env.RESEND_API_KEY);

export const EMAIL_CONFIG = {
  from: 'Voiltail <noreply@voiltail.com>', // Replace with your verified domain
  replyTo: 'support@voiltail.com',
};
```

**4.3 Email Templates**
```typescript
// lib/email/templates.ts
import { EMAIL_CONFIG } from './config';

export const emailTemplates = {
  welcome: (email: string, name?: string) => ({
    from: EMAIL_CONFIG.from,
    to: email,
    subject: 'Welcome to Voiltail Pro!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #06b6d4;">Welcome to Voiltail Pro!</h1>
        <p>Hi ${name || 'there'},</p>
        <p>Thank you for upgrading to Voiltail Pro! You now have access to:</p>
        <ul>
          <li>GPT-4 powered synthesis</li>
          <li>OpenAI embeddings analysis</li>
          <li>Real-time streaming updates</li>
          <li>No timeouts on complex queries</li>
          <li>Query history & saved sessions</li>
        </ul>
        <p>
          <a href="https://voiltail.com/consensus" 
             style="background: #06b6d4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Start Using Pro Features
          </a>
        </p>
        <p>If you have any questions, just reply to this email.</p>
        <p>Best regards,<br>The Voiltail Team</p>
      </div>
    `
  }),

  subscriptionCanceled: (email: string, name?: string) => ({
    from: EMAIL_CONFIG.from,
    to: email,
    subject: 'Your Voiltail Pro subscription has been canceled',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Subscription Canceled</h1>
        <p>Hi ${name || 'there'},</p>
        <p>We're sorry to see you go! Your Voiltail Pro subscription has been canceled.</p>
        <p>You'll continue to have access to Pro features until the end of your current billing period.</p>
        <p>If you change your mind, you can reactivate your subscription anytime.</p>
        <p>
          <a href="https://voiltail.com/upgrade" 
             style="background: #06b6d4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Reactivate Subscription
          </a>
        </p>
        <p>Best regards,<br>The Voiltail Team</p>
      </div>
    `
  }),

  paymentFailed: (email: string, name?: string) => ({
    from: EMAIL_CONFIG.from,
    to: email,
    subject: 'Payment failed for your Voiltail Pro subscription',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc2626;">Payment Failed</h1>
        <p>Hi ${name || 'there'},</p>
        <p>We couldn't process your payment for Voiltail Pro. Please update your payment method to continue using Pro features.</p>
        <p>
          <a href="https://voiltail.com/account/billing" 
             style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Update Payment Method
          </a>
        </p>
        <p>If you have any questions, just reply to this email.</p>
        <p>Best regards,<br>The Voiltail Team</p>
      </div>
    `
  })
};
```

**4.4 Email Service**
```typescript
// lib/email/service.ts
import { resend } from './config';
import { emailTemplates } from './templates';

export class EmailService {
  async sendWelcomeEmail(email: string, name?: string) {
    try {
      const template = emailTemplates.welcome(email, name);
      const result = await resend.emails.send(template);
      console.log('Welcome email sent:', result);
      return result;
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      throw error;
    }
  }

  async sendSubscriptionCanceledEmail(email: string, name?: string) {
    try {
      const template = emailTemplates.subscriptionCanceled(email, name);
      const result = await resend.emails.send(template);
      console.log('Cancellation email sent:', result);
      return result;
    } catch (error) {
      console.error('Failed to send cancellation email:', error);
      throw error;
    }
  }

  async sendPaymentFailedEmail(email: string, name?: string) {
    try {
      const template = emailTemplates.paymentFailed(email, name);
      const result = await resend.emails.send(template);
      console.log('Payment failed email sent:', result);
      return result;
    } catch (error) {
      console.error('Failed to send payment failed email:', error);
      throw error;
    }
  }
}

export const emailService = new EmailService();
```

### Step 5: Rate Limiting (Upstash Redis)

**5.1 Install Rate Limiting Dependencies**
```bash
npm install @upstash/redis @upstash/ratelimit
```

**5.2 Rate Limiting Configuration**
```typescript
// lib/rate-limit/config.ts
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error('Upstash Redis environment variables are not set');
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Rate limits for different user types
export const rateLimits = {
  // Free users: 10 queries per hour
  free: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 h'),
    analytics: true,
    prefix: 'voiltail:free',
  }),

  // Pro users: 100 queries per hour (burst protection)
  pro: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 h'),
    analytics: true,
    prefix: 'voiltail:pro',
  }),

  // API endpoints: General protection
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(1000, '1 h'),
    analytics: true,
    prefix: 'voiltail:api',
  }),
};

export { redis };
```

**5.3 Rate Limiting Middleware**
```typescript
// lib/rate-limit/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { rateLimits } from './config';
import { getSession } from '@/lib/auth/client';

export async function rateLimit(
  request: NextRequest,
  userType: 'free' | 'pro' | 'api' = 'free'
) {
  const ip = request.ip ?? '127.0.0.1';
  const session = await getSession();
  
  // Use user ID if authenticated, otherwise use IP
  const identifier = session?.user?.id ?? ip;
  
  const limit = rateLimits[userType];
  const { success, limit: maxRequests, remaining, reset } = await limit.limit(identifier);

  if (!success) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        limit: maxRequests,
        remaining: 0,
        reset: new Date(reset),
      },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': reset.toString(),
        }
      }
    );
  }

  return {
    success: true,
    headers: {
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': reset.toString(),
    }
  };
}
```

### Step 6: Integration and Migration

**6.1 Update Stripe Webhooks with Database Integration**
```typescript
// Update app/api/stripe/webhook/route.ts to use database
import { createClient } from '@supabase/supabase-js';
import { emailService } from '@/lib/email/service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const email = session.metadata?.userEmail;
  if (!email) return;

  try {
    // Create or update user profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .upsert({
        email,
        stripe_customer_id: session.customer as string,
        subscription_status: 'active'
      })
      .select()
      .single();

    if (error) throw error;

    // Send welcome email
    await emailService.sendWelcomeEmail(email);
    
    console.log('User profile created/updated:', profile.id);
  } catch (error) {
    console.error('Error handling checkout completion:', error);
  }
}
```

**6.2 Create User Migration Utility**
```typescript
// lib/migration/user-migration.ts
import { localStorageManager } from '@/lib/local-storage';
import { userManager } from '@/lib/user-management';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function migrateUserToDatabase(userId: string) {
  const localData = localStorageManager.exportData();
  const user = userManager.getUser();
  
  if (!user || localData.queries.length === 0) return;

  try {
    // Migrate query history
    const queries = localData.queries.map(query => ({
      user_id: userId,
      prompt: query.prompt,
      analysis: query.analysis,
      synthesis_type: query.tier,
      created_at: new Date(query.timestamp).toISOString()
    }));

    const { error } = await supabase
      .from('queries')
      .insert(queries);

    if (error) throw error;

    // Clear local storage after successful migration
    localStorageManager.clearData();
    
    console.log(`Migrated ${queries.length} queries to database`);
  } catch (error) {
    console.error('Error migrating user data:', error);
    throw error;
  }
}
```

## Phase 4 User Requirements

### [[[(((XXX!!!NEED USER INPUT HERE!!!XXX)))]]

**Domain Setup for Resend:**
1. Add your domain to Resend
2. Add DNS records as instructed by Resend
3. Verify domain ownership
4. Update EMAIL_CONFIG.from with your verified domain

**Google OAuth Setup (Optional):**
If you want Google sign-in:
1. Go to Google Cloud Console
2. Create OAuth 2.0 credentials
3. Add authorized redirect URIs
4. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local

**Production Deployment:**
1. Update BETTER_AUTH_URL to your production domain
2. Update all callback URLs in external services
3. Set up environment variables in Vercel
4. Test all integrations in production

**Manual Testing Required:**
1. Test complete user registration and login flow
2. Verify email delivery for all templates
3. Test rate limiting with different user types
4. Verify database operations and RLS policies
5. Test error tracking and monitoring
6. Verify analytics events are captured
7. Test user data migration from local storage
8. Verify Stripe webhook integration with database

**Cron Jobs Setup:**
Set up these cron jobs in Vercel or your deployment platform:
1. Daily subscription status sync
2. Monthly usage reset
3. Weekly cleanup of old data
4. Hourly health checks

---

## Deployment Checklist

### Pre-Deployment
- [ ] All environment variables configured
- [ ] Database migrations run successfully
- [ ] Stripe webhooks configured and tested
- [ ] Email templates tested and domain verified
- [ ] Rate limiting tested with different scenarios
- [ ] Error monitoring configured
- [ ] Analytics tracking implemented

### Production Deployment
- [ ] Deploy to Vercel with Pro plan
- [ ] Update all callback URLs to production domain
- [ ] Test complete user flow end-to-end
- [ ] Monitor error rates and performance
- [ ] Verify billing and subscription flows
- [ ] Test email delivery in production

### Post-Deployment
- [ ] Monitor system performance and costs
- [ ] Track user conversion rates
- [ ] Monitor API usage and rate limiting
- [ ] Review error logs and fix issues
- [ ] Gather user feedback and iterate

---

*Implementation Complete: Full Production SaaS System*
