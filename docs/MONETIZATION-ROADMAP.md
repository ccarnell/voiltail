# Voiltail Monetization Roadmap

## Overview
This document outlines the complete monetization strategy for Voiltail, including user authentication, subscription tiers, billing integration, and feature gating across the Express → Pro → Premium progression.

## Current Status: Express Mode (Free Tier)
- **Implementation**: ✅ Complete
- **Features**: Fast rule-based synthesis, local analysis
- **Target**: Development testing, casual users
- **Monetization**: None (cost optimization phase)

## Phase 2: Pro Mode Implementation (Next 2-3 months)

### 2.1 User Authentication (Supabase)

#### Setup Requirements
```bash
# Install Supabase dependencies
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs

# Environment variables needed
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### Database Schema
```sql
-- Users table (extends Supabase auth.users)
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  subscription_tier TEXT DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  tier TEXT NOT NULL, -- 'free', 'pro', 'premium'
  status TEXT NOT NULL, -- 'active', 'canceled', 'past_due'
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage tracking
CREATE TABLE public.usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id),
  query_count INTEGER DEFAULT 0,
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Query history
CREATE TABLE public.queries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id),
  prompt TEXT NOT NULL,
  mode TEXT DEFAULT 'consensus', -- 'consensus', 'divergence'
  responses JSONB,
  analysis JSONB,
  tokens_used INTEGER,
  cost_cents INTEGER, -- Cost in cents
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own usage" ON public.usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own queries" ON public.queries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own queries" ON public.queries
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

#### Authentication Components
```typescript
// components/auth/AuthProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { User } from '@supabase/auth-helpers-nextjs';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### 2.2 Stripe Integration

#### Setup Requirements
```bash
# Install Stripe dependencies
npm install stripe @stripe/stripe-js

# Environment variables
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

#### Pricing Configuration
```typescript
// lib/stripe/config.ts
export const PRICING_PLANS = {
  free: {
    id: 'free',
    name: 'Express',
    price: 0,
    queries: 10,
    features: [
      'Fast rule-based synthesis',
      'Basic alignment visualization',
      'No account required',
      '5-8 second response time'
    ],
    limitations: [
      'No query history',
      'No export functionality',
      'Basic synthesis quality'
    ]
  },
  pro: {
    id: 'price_pro_monthly', // Stripe Price ID
    name: 'Pro',
    price: 29,
    queries: 200,
    features: [
      'GPT-4 powered synthesis',
      'OpenAI embeddings analysis',
      'Query history & management',
      'Export functionality',
      'API access (limited)',
      'Priority support'
    ],
    popular: true
  },
  premium: {
    id: 'price_premium_monthly', // Stripe Price ID
    name: 'Premium',
    price: 79,
    queries: 500,
    features: [
      'Everything in Pro',
      'Streaming responses',
      'Background processing',
      'Real-time updates',
      'Full API access',
      'Custom model integration',
      'Priority processing'
    ]
  }
} as const;
```

#### Stripe Webhook Handler
```typescript
// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = headers().get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createServerComponentClient({ cookies });

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      const subscription = event.data.object as Stripe.Subscription;
      
      // Update user subscription in database
      await supabase
        .from('subscriptions')
        .upsert({
          stripe_customer_id: subscription.customer as string,
          stripe_subscription_id: subscription.id,
          tier: subscription.items.data[0].price.lookup_key || 'pro',
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000),
          current_period_end: new Date(subscription.current_period_end * 1000),
        });
      break;

    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object as Stripe.Subscription;
      
      // Update subscription status to canceled
      await supabase
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('stripe_subscription_id', deletedSubscription.id);
      break;

    case 'invoice.payment_succeeded':
      // Reset usage for the new billing period
      const invoice = event.data.object as Stripe.Invoice;
      // Implementation for usage reset
      break;
  }

  return NextResponse.json({ received: true });
}
```

### 2.3 Feature Gating & Usage Tracking

#### Usage Middleware
```typescript
// lib/middleware/usage.ts
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function checkUsageLimit(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  tier: string;
}> {
  const supabase = createServerComponentClient({ cookies });
  
  // Get user's subscription tier
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('tier')
    .eq('user_id', userId)
    .single();
  
  const tier = subscription?.tier || 'free';
  
  // Get current period usage
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  const { data: usage } = await supabase
    .from('usage')
    .select('query_count')
    .eq('user_id', userId)
    .gte('period_start', startOfMonth.toISOString())
    .single();
  
  const currentUsage = usage?.query_count || 0;
  const limits = {
    free: 10,
    pro: 200,
    premium: 500
  };
  
  const limit = limits[tier as keyof typeof limits];
  const remaining = Math.max(0, limit - currentUsage);
  
  return {
    allowed: currentUsage < limit,
    remaining,
    tier
  };
}

export async function incrementUsage(userId: string, cost: number) {
  const supabase = createServerComponentClient({ cookies });
  
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  const endOfMonth = new Date(startOfMonth);
  endOfMonth.setMonth(endOfMonth.getMonth() + 1);
  
  // Upsert usage record
  await supabase
    .from('usage')
    .upsert({
      user_id: userId,
      query_count: 1,
      period_start: startOfMonth.toISOString().split('T')[0],
      period_end: endOfMonth.toISOString().split('T')[0]
    }, {
      onConflict: 'user_id,period_start',
      ignoreDuplicates: false
    });
}
```

#### Protected Synthesis Route
```typescript
// app/api/ai/synthesize/route.ts (Pro Mode)
import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { checkUsageLimit, incrementUsage } from '@/lib/middleware/usage';
import { synthesizeWithSophisticatedAI } from '@/lib/ai/archive/synthesis-v1-sophisticated';

export async function POST(request: Request) {
  try {
    const { prompt, attachments } = await request.json();
    const supabase = createServerComponentClient({ cookies });
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required for Pro features' },
        { status: 401 }
      );
    }
    
    // Check usage limits
    const usageCheck = await checkUsageLimit(user.id);
    
    if (!usageCheck.allowed) {
      return NextResponse.json(
        { 
          error: 'Usage limit exceeded',
          tier: usageCheck.tier,
          remaining: usageCheck.remaining
        },
        { status: 429 }
      );
    }
    
    // Determine synthesis mode based on tier
    let analysis;
    if (usageCheck.tier === 'free') {
      // Use Express Mode synthesis
      analysis = await synthesizeWithFastMode(prompt, attachments);
    } else {
      // Use Pro Mode sophisticated synthesis
      analysis = await synthesizeWithSophisticatedAI(prompt, attachments);
    }
    
    // Track usage and cost
    const cost = calculateCost(usageCheck.tier, analysis.tokensUsed);
    await incrementUsage(user.id, cost);
    
    // Store query in history
    await supabase.from('queries').insert({
      user_id: user.id,
      prompt,
      mode: 'consensus',
      responses: analysis.originalResponses,
      analysis: analysis,
      tokens_used: analysis.tokensUsed,
      cost_cents: cost
    });
    
    return NextResponse.json({ 
      analysis,
      usage: {
        remaining: usageCheck.remaining - 1,
        tier: usageCheck.tier
      }
    });
    
  } catch (error) {
    console.error('Synthesis error:', error);
    return NextResponse.json(
      { error: 'Failed to synthesize responses' },
      { status: 500 }
    );
  }
}
```

### 2.4 User Dashboard

#### Dashboard Layout
```typescript
// app/(authenticated)/dashboard/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { UsageChart } from '@/components/dashboard/UsageChart';
import { QueryHistory } from '@/components/dashboard/QueryHistory';
import { SubscriptionCard } from '@/components/dashboard/SubscriptionCard';

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/login');
  }
  
  // Fetch user data
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single();
  
  const { data: usage } = await supabase
    .from('usage')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(12);
  
  const { data: recentQueries } = await supabase
    .from('queries')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);
  
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {profile?.full_name || user.email}</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <UsageChart data={usage} />
        </div>
        <div>
          <SubscriptionCard subscription={subscription} />
        </div>
      </div>
      
      <QueryHistory queries={recentQueries} />
    </div>
  );
}
```

## Phase 3: Premium Mode Implementation (Future 6+ months)

### 3.1 Streaming Architecture

#### WebSocket Implementation
```typescript
// lib/streaming/websocket.ts
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

export class StreamingService {
  private io: Server;
  
  constructor() {
    this.io = new Server({
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL,
        methods: ["GET", "POST"]
      }
    });
    
    // Redis adapter for scaling
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();
    this.io.adapter(createAdapter(pubClient, subClient));
  }
  
  async streamSynthesis(userId: string, prompt: string) {
    const room = `user_${userId}`;
    
    // Join user to their room
    this.io.to(room).emit('synthesis_started', { prompt });
    
    // Stream individual model responses
    const models = ['gemini', 'openai', 'claude'];
    const responses = [];
    
    for (const model of models) {
      try {
        const response = await this.callModelStreaming(model, prompt);
        responses.push(response);
        
        // Emit individual response
        this.io.to(room).emit('model_response', {
          model,
          response,
          progress: responses.length / models.length
        });
        
        // Emit progressive synthesis
        if (responses.length >= 2) {
          const partialSynthesis = await this.createPartialSynthesis(responses);
          this.io.to(room).emit('partial_synthesis', partialSynthesis);
        }
        
      } catch (error) {
        this.io.to(room).emit('model_error', { model, error: error.message });
      }
    }
    
    // Final synthesis
    const finalSynthesis = await this.createFinalSynthesis(responses);
    this.io.to(room).emit('synthesis_complete', finalSynthesis);
  }
  
  private async callModelStreaming(model: string, prompt: string) {
    // Implementation for streaming model calls
    // Return response with streaming updates
  }
  
  private async createPartialSynthesis(responses: any[]) {
    // Create synthesis from partial responses
  }
  
  private async createFinalSynthesis(responses: any[]) {
    // Create final sophisticated synthesis
  }
}
```

#### Streaming Frontend
```typescript
// components/streaming/StreamingSynthesis.tsx
'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface StreamingState {
  status: 'idle' | 'connecting' | 'streaming' | 'complete' | 'error';
  modelResponses: Record<string, string>;
  partialSynthesis?: string;
  finalSynthesis?: string;
  progress: number;
}

export function StreamingSynthesis({ prompt, userId }: {
  prompt: string;
  userId: string;
}) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<StreamingState>({
    status: 'idle',
    modelResponses: {},
    progress: 0
  });
  
  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL!);
    setSocket(newSocket);
    
    newSocket.emit('join_room', `user_${userId}`);
    
    newSocket.on('synthesis_started', () => {
      setState(prev => ({ ...prev, status: 'streaming' }));
    });
    
    newSocket.on('model_response', (data) => {
      setState(prev => ({
        ...prev,
        modelResponses: {
          ...prev.modelResponses,
          [data.model]: data.response
        },
        progress: data.progress
      }));
    });
    
    newSocket.on('partial_synthesis', (synthesis) => {
      setState(prev => ({
        ...prev,
        partialSynthesis: synthesis
      }));
    });
    
    newSocket.on('synthesis_complete', (synthesis) => {
      setState(prev => ({
        ...prev,
        status: 'complete',
        finalSynthesis: synthesis,
        progress: 1
      }));
    });
    
    return () => {
      newSocket.close();
    };
  }, [userId]);
  
  const startSynthesis = () => {
    if (socket) {
      socket.emit('start_synthesis', { prompt, userId });
    }
  };
  
  return (
    <div className="streaming-synthesis">
      {state.status === 'idle' && (
        <button onClick={startSynthesis}>Start Synthesis</button>
      )}
      
      {state.status === 'streaming' && (
        <div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${state.progress * 100}%` }}
            />
          </div>
          
          <div className="model-responses">
            {Object.entries(state.modelResponses).map(([model, response]) => (
              <div key={model} className="model-response">
                <h3>{model}</h3>
                <p>{response}</p>
              </div>
            ))}
          </div>
          
          {state.partialSynthesis && (
            <div className="partial-synthesis">
              <h3>Synthesis (Updating...)</h3>
              <p>{state.partialSynthesis}</p>
            </div>
          )}
        </div>
      )}
      
      {state.status === 'complete' && state.finalSynthesis && (
        <div className="final-synthesis">
          <h3>Final Synthesis</h3>
          <p>{state.finalSynthesis}</p>
        </div>
      )}
    </div>
  );
}
```

### 3.2 Background Processing

#### Queue System
```typescript
// lib/queue/synthesis-queue.ts
import { Queue, Worker } from 'bullmq';
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });

export const synthesisQueue = new Queue('synthesis', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
  }
});

export const synthesisWorker = new Worker('synthesis', async (job) => {
  const { userId, prompt, attachments, mode } = job.data;
  
  try {
    // Update job progress
    await job.updateProgress(10);
    
    // Call models
    const responses = await callAllModels(prompt, attachments);
    await job.updateProgress(60);
    
    // Create sophisticated synthesis
    const analysis = await createSophisticatedSynthesis(responses);
    await job.updateProgress(90);
    
    // Store in database
    await storeAnalysis(userId, prompt, analysis);
    await job.updateProgress(100);
    
    // Notify user via WebSocket
    await notifyUser(userId, analysis);
    
    return analysis;
    
  } catch (error) {
    console.error('Background synthesis failed:', error);
    throw error;
  }
}, {
  connection: redis,
  concurrency: 5
});
```

## Revenue Projections

### Year 1 Targets
```
Month 1-3 (Express Mode):
- Users: 100-500
- Revenue: $0 (cost optimization)
- Focus: Product validation

Month 4-6 (Pro Mode Launch):
- Users: 500-2,000
- Pro Subscribers: 50-200 (10% conversion)
- Revenue: $1,500-6,000/month
- Focus: Feature development

Month 7-12 (Pro Mode Growth):
- Users: 2,000-10,000
- Pro Subscribers: 200-1,000
- Premium Subscribers: 20-100
- Revenue: $6,000-40,000/month
- Focus: Scale and optimization
```

### Pricing Strategy
```
Express (Free):
- 10 queries/month
- Basic synthesis
- No account required

Pro ($29/month):
- 200 queries/month
- GPT-4 synthesis
- Query history
- API access
- Export features

Premium ($79/month):
- 500 queries/month
- Streaming responses
- Background processing
- Priority support
- Custom integrations
```

## Implementation Timeline

### Phase 2: Pro Mode (Months 1-3)
- **Month 1**: Authentication & database setup
- **Month 2**: Stripe integration & billing
- **Month 3**: Sophisticated synthesis restoration & testing

### Phase 3: Premium Mode (Months 4-9)
- **Month 4-5**: Streaming architecture design & implementation
- **Month 6-7**: Background processing & queue system
- **Month 8-9**: Advanced features & enterprise tools

### Phase 4: Scale & Optimize (Months 10-12)
- **Month 10**: Performance optimization & caching
- **Month 11**: Enterprise features & custom models
- **Month 12**: Analytics, insights, and advanced reporting

---

**Last Updated**: July 5, 2025
**Current Phase**: Express Mode (Complete)
**Next Milestone**: Pro Mode Authentication Setup
**Revenue Target**: $40K/month by Month 12
