# Phase 3: Payment Integration

## 🔄 TRIPWIRE CHECKPOINT
*Execute the comprehensive analysis before proceeding with Phase 3.*

## Objective
Implement Stripe payment processing with batched billing to minimize transaction fees while maintaining a smooth user experience.

## Success Criteria
- [ ] Stripe integration works reliably
- [ ] Batched billing reduces transaction costs
- [ ] User accounts are created seamlessly on upgrade
- [ ] Payment failures are handled gracefully
- [ ] Billing reconciliation works correctly

## User Requirements

### [[[(((XXX!!!NEED USER INPUT HERE!!!XXX)))]]

**Stripe Account Setup:**
1. Create Stripe account at https://stripe.com
2. Get API keys from Stripe Dashboard
3. Create products and prices in Stripe Dashboard:
   - Product: "Voiltail Pro"
   - Price: $39/month recurring
4. Set up webhook endpoint (we'll provide URL after implementation)

**Environment Variables Required:**
```env
# Add to .env.local
STRIPE_SECRET_KEY=sk_test_... # From Stripe Dashboard
STRIPE_WEBHOOK_SECRET=whsec_... # From Stripe Webhook settings
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # From Stripe Dashboard
STRIPE_PRO_PRICE_ID=price_... # From Stripe Product/Price setup
```

## Implementation Steps

### Step 1: Stripe Configuration

**1.1 Install Stripe Dependencies**
```bash
npm install stripe @stripe/stripe-js
npm install --save-dev @types/stripe
```

**1.2 Create Stripe Configuration**
```typescript
// lib/stripe/config.ts
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export const STRIPE_CONFIG = {
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
  proPriceId: process.env.STRIPE_PRO_PRICE_ID!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
};

// Validate required environment variables
if (!STRIPE_CONFIG.publishableKey) {
  throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set');
}

if (!STRIPE_CONFIG.proPriceId) {
  throw new Error('STRIPE_PRO_PRICE_ID is not set');
}
```

### Step 2: Basic User Account System

**2.1 Create Simple User Management**
```typescript
// lib/user-management.ts
interface User {
  id: string;
  email: string;
  stripeCustomerId?: string;
  subscriptionStatus: 'free' | 'active' | 'canceled' | 'past_due';
  subscriptionId?: string;
  currentPeriodEnd?: number;
  createdAt: number;
}

class UserManager {
  private readonly STORAGE_KEY = 'voiltail_user';

  createUser(email: string): User {
    const user: User = {
      id: crypto.randomUUID(),
      email,
      subscriptionStatus: 'free',
      createdAt: Date.now()
    };
    
    this.saveUser(user);
    return user;
  }

  getUser(): User | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  saveUser(user: User): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
  }

  updateSubscription(
    subscriptionStatus: User['subscriptionStatus'],
    subscriptionId?: string,
    currentPeriodEnd?: number
  ): void {
    const user = this.getUser();
    if (user) {
      user.subscriptionStatus = subscriptionStatus;
      user.subscriptionId = subscriptionId;
      user.currentPeriodEnd = currentPeriodEnd;
      this.saveUser(user);
    }
  }

  isProUser(): boolean {
    const user = this.getUser();
    return user?.subscriptionStatus === 'active';
  }

  clearUser(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

export const userManager = new UserManager();
```

### Step 3: Stripe Checkout Integration

**3.1 Create Checkout API Route**
```typescript
// app/api/stripe/create-checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_CONFIG } from '@/lib/stripe/config';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    // Create or retrieve Stripe customer
    let customer;
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email,
        metadata: {
          source: 'voiltail_upgrade'
        }
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      line_items: [
        {
          price: STRIPE_CONFIG.proPriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${request.nextUrl.origin}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/upgrade/canceled`,
      metadata: {
        userEmail: email
      },
      subscription_data: {
        metadata: {
          userEmail: email
        }
      }
    });

    return NextResponse.json({ 
      url: session.url,
      sessionId: session.id 
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
```

### Step 4: Webhook Handling

**4.1 Create Stripe Webhook Handler**
```typescript
// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_CONFIG } from '@/lib/stripe/config';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      STRIPE_CONFIG.webhookSecret
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('Checkout completed:', session.id);
  
  // In a full implementation, you'd update your database here
  // For now, we'll rely on client-side updates
  
  if (session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );
    
    console.log('Subscription created:', subscription.id);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id, subscription.status);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Payment failed for invoice:', invoice.id);
}
```

### Step 5: Upgrade Flow UI

**5.1 Create Upgrade Page**
```typescript
// app/upgrade/page.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Check, Loader2 } from 'lucide-react';
import { userManager } from '@/lib/user-management';

export default function UpgradePage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Create user account before redirecting
      userManager.createUser(email);

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <Card className="bg-gray-900 border-gray-700 p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Upgrade to Pro</h1>
          <p className="text-gray-400">
            Unlock advanced synthesis with GPT-4 and semantic analysis
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-3">
            <Check className="w-5 h-5 text-green-400" />
            <span>GPT-4 powered synthesis</span>
          </div>
          <div className="flex items-center gap-3">
            <Check className="w-5 h-5 text-green-400" />
            <span>OpenAI embeddings analysis</span>
          </div>
          <div className="flex items-center gap-3">
            <Check className="w-5 h-5 text-green-400" />
            <span>Real-time streaming updates</span>
          </div>
          <div className="flex items-center gap-3">
            <Check className="w-5 h-5 text-green-400" />
            <span>No timeouts on complex queries</span>
          </div>
          <div className="flex items-center gap-3">
            <Check className="w-5 h-5 text-green-400" />
            <span>Query history & saved sessions</span>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-lg">Pro Tier</div>
              <div className="text-sm text-gray-400">Full access to advanced features</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">$39</div>
              <div className="text-sm text-gray-400">/month</div>
            </div>
          </div>
        </div>

        <form onSubmit={handleUpgrade} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Email Address
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="bg-gray-800 border-gray-600"
              required
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          <Button
            type="submit"
            disabled={isLoading || !email}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-black font-medium"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating checkout...
              </>
            ) : (
              'Upgrade to Pro - $39/month'
            )}
          </Button>
        </form>

        <div className="text-xs text-gray-500 text-center mt-4">
          Cancel anytime • No long-term commitment • Secure payment via Stripe
        </div>
      </Card>
    </div>
  );
}
```

**5.2 Create Success and Cancel Pages**
```typescript
// app/upgrade/success/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
import { userManager } from '@/lib/user-management';
import { localStorageManager } from '@/lib/local-storage';
import Link from 'next/link';

export default function UpgradeSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [isProcessing, setIsProcessing] = useState(true);
  const [showMigrationOption, setShowMigrationOption] = useState(false);

  useEffect(() => {
    const processUpgrade = async () => {
      if (sessionId) {
        // Update user status to Pro
        userManager.updateSubscription('active');
        
        // Check if user has local data to migrate
        const localData = localStorageManager.exportData();
        if (localData.queries.length > 0) {
          setShowMigrationOption(true);
        }
      }
      setIsProcessing(false);
    };

    processUpgrade();
  }, [sessionId]);

  const handleMigrateData = () => {
    // In a full implementation, this would send data to server
    alert('Data migration will be implemented with full database integration');
    localStorageManager.clearData();
    setShowMigrationOption(false);
  };

  const handleStartFresh = () => {
    localStorageManager.clearData();
    setShowMigrationOption(false);
  };

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Card className="bg-gray-900 border-gray-700 p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Processing your upgrade...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <Card className="bg-gray-900 border-gray-700 p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-8 h-8 text-green-400" />
        </div>
        
        <h1 className="text-2xl font-bold mb-2">Welcome to Pro!</h1>
        <p className="text-gray-400 mb-8">
          Your upgrade was successful. You now have access to advanced synthesis features.
        </p>

        {showMigrationOption && (
          <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
            <h3 className="font-medium mb-2">Import Your Query History?</h3>
            <p className="text-sm text-gray-400 mb-4">
              We found {localStorageManager.getQueryHistory().length} queries in your local history. 
              Would you like to import them to your Pro account?
            </p>
            <div className="flex gap-2">
              <Button
                onClick={handleMigrateData}
                className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-black"
              >
                Import History
              </Button>
              <Button
                onClick={handleStartFresh}
                variant="outline"
                className="flex-1 border-gray-600"
              >
                Start Fresh
              </Button>
            </div>
          </div>
        )}

        <Link href="/consensus">
          <Button className="w-full bg-cyan-600 hover:bg-cyan-700 text-black font-medium">
            Start Using Pro Features
          </Button>
        </Link>
      </Card>
    </div>
  );
}

// app/upgrade/canceled/page.tsx
'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import Link from 'next/link';

export default function UpgradeCanceledPage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <Card className="bg-gray-900 border-gray-700 p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <X className="w-8 h-8 text-red-400" />
        </div>
        
        <h1 className="text-2xl font-bold mb-2">Upgrade Canceled</h1>
        <p className="text-gray-400 mb-8">
          No worries! You can continue using the basic tier or upgrade anytime.
        </p>

        <div className="space-y-3">
          <Link href="/consensus">
            <Button className="w-full bg-gray-700 hover:bg-gray-600">
              Continue with Basic Tier
            </Button>
          </Link>
          <Link href="/upgrade">
            <Button className="w-full bg-cyan-600 hover:bg-cyan-700 text-black">
              Try Upgrading Again
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
```

### Step 6: Update Upgrade Modal Integration

**6.1 Connect Upgrade Modal to Stripe Flow**
```typescript
// Update components/UpgradeModal.tsx onUpgrade handler

const handleUpgrade = () => {
  // Redirect to upgrade page instead of alert
  window.location.href = '/upgrade';
};

// Update the onUpgrade prop in the modal usage
<UpgradeModal
  isOpen={showUpgradeModal}
  onClose={() => setShowUpgradeModal(false)}
  reason={upgradeReason}
  onUpgrade={handleUpgrade}
/>
```

## Phase 3 User Requirements

### [[[(((XXX!!!NEED USER INPUT HERE!!!XXX)))]]

**Stripe Webhook Setup:**
After implementing the webhook handler, you need to:
1. Deploy the webhook endpoint to production
2. Add the webhook URL in Stripe Dashboard: `https://yourdomain.com/api/stripe/webhook`
3. Select these events to send:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`

**Manual Testing Required:**
1. Test Stripe checkout flow end-to-end
2. Verify webhook events are received correctly
3. Test subscription status updates
4. Test payment failure scenarios
5. Verify user account creation and management
6. Test data migration options on upgrade
7. Test upgrade/cancel page flows

**Integration Steps:**
1. Set up Stripe account and get API keys
2. Create products and prices in Stripe Dashboard
3. Configure webhook endpoints
4. Test in Stripe test mode before going live
5. Update upgrade modal to redirect to new upgrade page

---

*Next: Phase 4 - Full Production System*
