# Phase 2: Enhanced User Experience

## 🔄 TRIPWIRE CHECKPOINT
*Please stop. Pause. Inhale with a deep breath. As you exhale, open up your mind to our overall project (both technical and operations). Ask yourself if we are implementing the correct features in the correct order. Ask yourself what issues we could potentially run in to. Ask yourself why those could potentially be issues. If they have anything to do with our current plan, consider how we should update our plan. If they are things we could run into, consider what our contingency plans should be. Ask yourself from both a high-level view of our project and each individual feature that you and I will be implementing, what the second- and third-order consequences could be that we have not take into consideration. Are any of those things critical enough that we should update our plan? Why? If it critical enough, keep the context of what those updates should be.*

*Now pause again. You have thought through what our current plan is, the effects of our implementation, and you have addressed potential issues or oversights we have not considered so far. Now I want you to place yourself at the end of the last step of this phase with everything completed. Take a look back and ask yourself if we should have done anything differently, if we missed something, if anything is wrong, or there are considerations we should have made that we did not. Let's address all of these now before we crystallize our plan.*

## Objective
Enhance the user experience with local storage, usage tracking, and improved error handling while maintaining the dual-tier system.

## Success Criteria
- [ ] Local storage works reliably for free users
- [ ] Usage tracking prevents abuse
- [ ] Error handling provides clear user feedback
- [ ] Upgrade prompts are contextual and effective
- [ ] Performance remains optimal

## Implementation Steps

### Step 1: Local Storage System

**1.1 Create Local Storage Manager**
```typescript
// lib/local-storage.ts
interface LocalUserData {
  queries: {
    id: string;
    prompt: string;
    timestamp: number;
    analysis?: ConsensusAnalysis;
    tier: 'basic' | 'pro';
  }[];
  preferences: {
    theme: 'light' | 'dark';
    defaultTier: 'basic' | 'pro';
  };
  usage: {
    basicQueries: number;
    lastReset: number; // Daily reset for $5 base + $1/query model
  };
  lastCleanup: number;
}

class LocalStorageManager {
  private readonly STORAGE_KEY = 'voiltail_user_data';
  private readonly MAX_QUERIES = 50; // Keep last 50 queries
  private readonly CLEANUP_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7 days

  getData(): LocalUserData {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return this.getDefaultData();
      
      const data = JSON.parse(stored) as LocalUserData;
      this.cleanupIfNeeded(data);
      return data;
    } catch (error) {
      console.error('Error reading local storage:', error);
      return this.getDefaultData();
    }
  }

  saveData(data: LocalUserData): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving to local storage:', error);
    }
  }

  addQuery(prompt: string, analysis: ConsensusAnalysis, tier: 'basic' | 'pro'): void {
    const data = this.getData();
    
    const newQuery = {
      id: crypto.randomUUID(),
      prompt,
      analysis,
      tier,
      timestamp: Date.now()
    };
    
    data.queries.unshift(newQuery);
    
    // Keep only the most recent queries
    if (data.queries.length > this.MAX_QUERIES) {
      data.queries = data.queries.slice(0, this.MAX_QUERIES);
    }
    
    // Update usage for basic tier
    if (tier === 'basic') {
      this.resetUsageIfNeeded(data);
      data.usage.basicQueries += 1;
    }
    
    this.saveData(data);
  }

  getUsage(): { basicQueries: number; canUseBasic: boolean; costOwed: number } {
    const data = this.getData();
    this.resetUsageIfNeeded(data);
    
    const costOwed = data.usage.basicQueries > 0 
      ? 5 + (data.usage.basicQueries * 1) // $5 base + $1 per query
      : 0;
    
    return {
      basicQueries: data.usage.basicQueries,
      canUseBasic: true, // Always allow basic queries, track cost
      costOwed
    };
  }

  private resetUsageIfNeeded(data: LocalUserData): void {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    if (data.usage.lastReset < oneDayAgo) {
      // Reset daily for billing purposes
      data.usage.basicQueries = 0;
      data.usage.lastReset = now;
      this.saveData(data);
    }
  }

  private cleanupIfNeeded(data: LocalUserData): void {
    const now = Date.now();
    
    if (now - data.lastCleanup > this.CLEANUP_INTERVAL) {
      // Remove queries older than 30 days
      const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
      data.queries = data.queries.filter(q => q.timestamp > thirtyDaysAgo);
      data.lastCleanup = now;
      this.saveData(data);
    }
  }

  private getDefaultData(): LocalUserData {
    return {
      queries: [],
      preferences: {
        theme: 'dark',
        defaultTier: 'basic'
      },
      usage: {
        basicQueries: 0,
        lastReset: Date.now()
      },
      lastCleanup: Date.now()
    };
  }

  exportData(): LocalUserData {
    return this.getData();
  }

  clearData(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  getQueryHistory(): LocalUserData['queries'] {
    return this.getData().queries;
  }
}

export const localStorageManager = new LocalStorageManager();
```

### Step 2: Usage Tracking and Billing Display

**2.1 Create Usage Display Component**
```typescript
// components/UsageDisplay.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { localStorageManager } from '@/lib/local-storage';

export function UsageDisplay() {
  const [usage, setUsage] = useState({ basicQueries: 0, canUseBasic: true, costOwed: 0 });

  useEffect(() => {
    const updateUsage = () => {
      setUsage(localStorageManager.getUsage());
    };
    
    updateUsage();
    
    // Update usage display when storage changes
    const handleStorageChange = () => updateUsage();
    window.addEventListener('storage', handleStorageChange);
    
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (usage.costOwed === 0) return null;

  return (
    <Card className="bg-amber-900/20 border-amber-500/30 p-4 mb-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-amber-200">
            Current Usage
          </div>
          <div className="text-xs text-amber-300">
            {usage.basicQueries} queries today • ${usage.costOwed} owed
          </div>
        </div>
        
        <Button 
          size="sm" 
          className="bg-amber-600 hover:bg-amber-700 text-black"
          onClick={() => {
            // TODO: Implement payment flow in Phase 3
            alert('Payment integration coming in Phase 3!');
          }}
        >
          Pay Now
        </Button>
      </div>
    </Card>
  );
}
```

### Step 3: Enhanced Error Handling

**3.1 Create Error Boundary Component**
```typescript
// components/ErrorBoundary.tsx
'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="bg-red-900/20 border-red-500/30 p-6 m-4">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <h2 className="text-lg font-semibold text-red-200">
              Something went wrong
            </h2>
          </div>
          
          <p className="text-red-300 mb-4">
            An unexpected error occurred. This might be due to a network issue or a temporary problem with our services.
          </p>
          
          <div className="flex gap-3">
            <Button
              onClick={() => this.setState({ hasError: false })}
              className="bg-red-600 hover:bg-red-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </Button>
          </div>
          
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4">
              <summary className="text-sm text-red-400 cursor-pointer">
                Error Details (Development)
              </summary>
              <pre className="text-xs text-red-300 mt-2 p-2 bg-red-950/50 rounded overflow-auto">
                {this.state.error?.stack}
              </pre>
            </details>
          )}
        </Card>
      );
    }

    return this.props.children;
  }
}
```

### Step 4: Upgrade Prompts and Modals

**4.1 Create Upgrade Modal System**
```typescript
// components/UpgradeModal.tsx
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, Clock, Brain } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason: 'timeout' | 'quality' | 'features';
  onUpgrade: () => void;
}

export function UpgradeModal({ isOpen, onClose, reason, onUpgrade }: UpgradeModalProps) {
  const reasonConfig = {
    timeout: {
      title: "Query Too Complex for Basic Tier",
      description: "This query requires advanced processing that exceeds our basic tier capabilities.",
      icon: <Clock className="w-6 h-6 text-amber-400" />
    },
    quality: {
      title: "Unlock Superior Synthesis Quality",
      description: "Get GPT-4 powered synthesis with semantic analysis for much better results.",
      icon: <Brain className="w-6 h-6 text-purple-400" />
    },
    features: {
      title: "Access Pro Features",
      description: "Unlock advanced synthesis capabilities and premium features.",
      icon: <Zap className="w-6 h-6 text-cyan-400" />
    }
  };

  const config = reasonConfig[reason];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {config.icon}
            <DialogTitle className="text-xl">{config.title}</DialogTitle>
          </div>
          <DialogDescription className="text-gray-300">
            {config.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Current vs Pro Comparison */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-300">Basic Tier</h4>
              <div className="text-sm text-gray-400 space-y-1">
                <div>• Fast rule-based synthesis</div>
                <div>• Basic alignment analysis</div>
                <div>• $5 base + $1/query</div>
                <div>• May timeout on complex queries</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-cyan-300">Pro Tier</h4>
              <div className="text-sm text-cyan-200 space-y-1">
                <div className="flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  GPT-4 powered synthesis
                </div>
                <div className="flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  OpenAI embeddings analysis
                </div>
                <div className="flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Real-time streaming updates
                </div>
                <div className="flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  No timeouts on complex queries
                </div>
                <div className="flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Query history & saved sessions
                </div>
              </div>
            </div>
          </div>
          
          {/* Pricing */}
          <div className="bg-gray-800/50 rounded-lg p-4">
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
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={onUpgrade}
              className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-black font-medium"
            >
              Upgrade to Pro
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Maybe Later
            </Button>
          </div>
          
          <div className="text-xs text-gray-500 text-center">
            Cancel anytime • No long-term commitment
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**4.2 Integrate Components into Main App**
```typescript
// Update app/consensus/page.tsx to include new components

import { UsageDisplay } from '@/components/UsageDisplay';
import { UpgradeModal } from '@/components/UpgradeModal';
import { localStorageManager } from '@/lib/local-storage';

// Add state for upgrade modal
const [showUpgradeModal, setShowUpgradeModal] = useState(false);
const [upgradeReason, setUpgradeReason] = useState<'timeout' | 'quality' | 'features'>('quality');

// Add usage display before the input area
<UsageDisplay />

// Add upgrade modal at the end of the component
<UpgradeModal
  isOpen={showUpgradeModal}
  onClose={() => setShowUpgradeModal(false)}
  reason={upgradeReason}
  onUpgrade={() => {
    // TODO: Implement upgrade flow in Phase 3
    alert('Upgrade flow coming in Phase 3!');
    setShowUpgradeModal(false);
  }}
/>

// Update error handling to show upgrade prompts on timeout
const handleBasicSynthesis = async (currentPrompt: string) => {
  try {
    // Add timeout wrapper
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 55000); // 55s timeout
    });
    
    const synthesisPromise = fetch('/api/ai/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: currentPrompt })
    });
    
    const response = await Promise.race([synthesisPromise, timeoutPromise]) as Response;
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Save to local storage
    localStorageManager.addQuery(currentPrompt, data.analysis, 'basic');
    
    setConversations(prev => [...prev, {
      prompt: currentPrompt,
      analysis: data.analysis,
      showDetails: false
    }]);
    
  } catch (error) {
    if (error instanceof Error && error.message === 'TIMEOUT') {
      setUpgradeReason('timeout');
      setShowUpgradeModal(true);
    } else {
      throw error;
    }
  }
};
```

### Step 5: Query History Component

**5.1 Create Query History Sidebar**
```typescript
// components/QueryHistory.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Trash2 } from 'lucide-react';
import { localStorageManager } from '@/lib/local-storage';

interface QueryHistoryProps {
  onSelectQuery: (query: any) => void;
}

export function QueryHistory({ onSelectQuery }: QueryHistoryProps) {
  const [queries, setQueries] = useState<any[]>([]);

  useEffect(() => {
    const loadQueries = () => {
      setQueries(localStorageManager.getQueryHistory());
    };
    
    loadQueries();
    
    // Listen for storage changes
    const handleStorageChange = () => loadQueries();
    window.addEventListener('storage', handleStorageChange);
    
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const clearHistory = () => {
    if (confirm('Are you sure you want to clear all query history?')) {
      localStorageManager.clearData();
      setQueries([]);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (queries.length === 0) {
    return (
      <Card className="bg-gray-900/50 border-gray-700 p-4">
        <div className="text-center text-gray-400">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No query history yet</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900/50 border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-200">Query History</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearHistory}
            className="text-gray-400 hover:text-red-400"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <ScrollArea className="h-96">
        <div className="p-2 space-y-2">
          {queries.map((query) => (
            <div
              key={query.id}
              className="p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 cursor-pointer transition-colors"
              onClick={() => onSelectQuery(query)}
            >
              <div className="text-sm text-gray-200 line-clamp-2 mb-1">
                {query.prompt}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className={`px-2 py-1 rounded ${
                  query.tier === 'pro' 
                    ? 'bg-cyan-900/50 text-cyan-300' 
                    : 'bg-amber-900/50 text-amber-300'
                }`}>
                  {query.tier === 'pro' ? 'Pro' : 'Basic'}
                </span>
                <span>{formatDate(query.timestamp)}</span>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
```

## Phase 2 User Requirements

### [[[(((XXX!!!NEED USER INPUT HERE!!!XXX)))]]

**No additional environment variables or external services required for Phase 2.**

**Manual Testing Required:**
1. Test local storage functionality across browser sessions
2. Verify usage tracking and cost calculation
3. Test error boundary with intentional errors
4. Verify upgrade modals appear at appropriate times
5. Test data persistence and cleanup
6. Verify query history component works

**Integration Steps:**
1. Add new components to your main consensus page
2. Wrap your app with ErrorBoundary component
3. Test timeout scenarios to trigger upgrade prompts
4. Verify local storage data structure and cleanup

---

*Next: Phase 3 - Payment Integration*
