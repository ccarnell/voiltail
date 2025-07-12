# AI Voiltail - Technical Specification Document (TSD)

## Executive Summary

Voiltail is an innovative multi-LLM interaction platform that implements a tiered architecture for AI response synthesis and analysis. The platform provides sophisticated consensus analysis while balancing performance, cost, and quality across different user tiers.

**Current Implementation**: Express Mode - Fast rule-based synthesis (5-8 seconds)
**Next Phase**: Pro Mode - AI-powered synthesis with user accounts and billing
**Future Vision**: Premium Mode - Streaming responses with background processing

This document outlines the complete technical specification for the tiered platform architecture using Next.js App Router, Tailwind CSS, Supabase, and Stripe.

## Product Vision & Implementation Tiers

### Tier 1: Express Mode ✅ (Current - Complete)
- **Target**: Developers, casual researchers, cost-conscious users
- **Features**: Fast rule-based synthesis, local semantic analysis
- **Performance**: 5-8 seconds response time
- **Cost**: $0.01-0.03 per query
- **Deployment**: Vercel Hobby plan compatible

### Tier 2: Pro Mode (Next Phase - 2-3 months)
- **Target**: Professional researchers, content creators, businesses
- **Features**: GPT-4 synthesis, OpenAI embeddings, user accounts, billing
- **Performance**: 15-25 seconds response time
- **Cost**: $0.05-0.15 per query, $29/month subscription
- **Deployment**: Vercel Pro plan required

### Tier 3: Premium Mode (Future - 6+ months)
- **Target**: Enterprise customers, high-volume users
- **Features**: Streaming responses, background processing, real-time updates
- **Performance**: 3-5 seconds initial + 10-15 seconds enhanced
- **Cost**: $0.08-0.20 per query, premium pricing
- **Deployment**: Enhanced Vercel Pro with WebSocket support

### Tier 4: Divergence Mode (Future - 12+ months)
- **Target**: Advanced researchers, data scientists
- **Features**: Interactive knowledge graphs, complex relationship mapping
- **Performance**: Variable based on graph complexity
- **Cost**: Enterprise pricing
- **Deployment**: Specialized infrastructure

## Technical Architecture

### Core Tech Stack
```
Frontend:
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Framer Motion (animations)

Backend:
- Next.js API Routes
- Supabase (PostgreSQL)
- Stripe (payments)
- Vercel (hosting)

AI Integration:
- OpenAI API (GPT-4)
- Anthropic API (Claude)
- Google AI API (Gemini)
```

### Project Structure
```
voiltail/
├── app/
│   ├── (marketing)/
│   │   ├── page.tsx              # Landing page
│   │   └── layout.tsx            # Marketing layout
│   ├── (app)/
│   │   ├── consensus/
│   │   │   ├── page.tsx          # Consensus mode
│   │   │   └── loading.tsx       # Loading state
│   │   ├── divergence/
│   │   │   ├── page.tsx          # Divergence mode (Phase 2)
│   │   │   └── components/       # Graph components
│   │   ├── history/
│   │   │   └── page.tsx          # Query history (Phase 3)
│   │   └── layout.tsx            # App layout with navigation
│   ├── api/
│   │   ├── ai/
│   │   │   ├── synthesize/
│   │   │   │   └── route.ts      # Synthesis endpoint
│   │   │   ├── analyze/
│   │   │   │   └── route.ts      # Analysis endpoint
│   │   │   └── models/
│   │   │       ├── gemini/
│   │   │       │   └── route.ts
│   │   │       ├── openai/
│   │   │       │   └── route.ts
│   │   │       └── claude/
│   │   │           └── route.ts
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts      # Supabase auth (Phase 3)
│   │   └── webhooks/
│   │       └── stripe/
│   │           └── route.ts      # Stripe webhooks (Phase 3)
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── consensus/
│   │   ├── ConsensusView.tsx
│   │   ├── AlignmentBar.tsx
│   │   ├── SynthesisDisplay.tsx
│   │   └── DivergenceHighlight.tsx
│   ├── divergence/
│   │   ├── DivergenceGraph.tsx
│   │   ├── NodeComponent.tsx
│   │   └── ConnectionLines.tsx
│   └── shared/
│       ├── Header.tsx
│       ├── ModeToggle.tsx
│       ├── QueryInput.tsx
│       └── FileUpload.tsx
├── lib/
│   ├── ai/
│   │   ├── synthesis.ts          # Synthesis logic
│   │   ├── alignment.ts          # Alignment calculation
│   │   └── divergence.ts         # Divergence mapping
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── stripe/
│   │   ├── client.ts
│   │   └── config.ts
│   └── utils.ts
├── types/
│   ├── ai.ts                     # AI-related types
│   ├── database.ts               # Supabase types
│   └── index.ts                  # Shared types
└── styles/
    └── themes.ts                 # Theme configuration
```

## Data Models

### Core Types
```typescript
// types/ai.ts
export interface AIResponse {
  id: string
  timestamp: string
  prompt: string
  attachments?: FileAttachment[]
  responses: {
    claude: string
    gpt: string
    gemini: string
  }
  responseTime: {
    claude: number
    gpt: number
    gemini: number
  }
}

export interface ConsensusAnalysis {
  unifiedResponse: string
  agreementLevel: number // 0-100
  alignedPoints: AlignedPoint[]
  divergentSections: DivergentSection[]
  confidence: number
}

export interface DivergenceAnalysis {
  nodes: DivergenceNode[]
  connections: Connection[]
  clusters: Cluster[]
  maxDivergence: number
}

export interface DivergenceNode {
  id: string
  content: string
  type: 'agreement' | 'disagreement' | 'unique'
  models: ('claude' | 'gpt' | 'gemini')[]
  position: { x: number; y: number }
  importance: number
  metadata?: {
    reasoning?: string
    confidence?: number
    category?: string
  }
}

// types/database.ts (Supabase)
export interface UserQuery {
  id: string
  user_id: string
  prompt: string
  mode: 'consensus' | 'divergence'
  responses: AIResponse
  analysis: ConsensusAnalysis | DivergenceAnalysis
  created_at: string
  tokens_used: number
  cost: number
}

export interface UserSubscription {
  id: string
  user_id: string
  stripe_customer_id: string
  stripe_subscription_id: string
  tier: 'free' | 'pro' | 'enterprise'
  queries_remaining: number
  reset_date: string
}
```

## Feature Specifications

### Phase 1: Consensus Mode (Week 1)

#### 1.1 Core Synthesis Engine
```typescript
// lib/ai/synthesis.ts
export async function synthesizeResponses(
  responses: ModelResponses,
  options: SynthesisOptions = {}
): Promise<ConsensusAnalysis> {
  // 1. Analyze responses for common themes
  const themes = extractThemes(responses)
  
  // 2. Calculate alignment scores
  const alignment = calculateAlignment(responses)
  
  // 3. Generate unified response
  const unified = await generateSynthesis(responses, themes, alignment)
  
  // 4. Identify divergent sections
  const divergences = findDivergences(responses)
  
  return {
    unifiedResponse: unified,
    agreementLevel: alignment.overall,
    alignedPoints: alignment.points,
    divergentSections: divergences,
    confidence: calculateConfidence(alignment)
  }
}
```

#### 1.2 UI Components

**ConsensusView Component**
```typescript
// components/consensus/ConsensusView.tsx
export function ConsensusView({ analysis }: { analysis: ConsensusAnalysis }) {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Agreement Indicator */}
      <AlignmentBar level={analysis.agreementLevel} />
      
      {/* Main Synthesis */}
      <div className="prose prose-invert">
        <SynthesisDisplay 
          content={analysis.unifiedResponse}
          divergences={analysis.divergentSections}
        />
      </div>
      
      {/* Expandable Details */}
      <ModelDetails responses={analysis.originalResponses} />
    </div>
  )
}
```

#### 1.3 API Routes
```typescript
// app/api/ai/synthesize/route.ts
export async function POST(request: Request) {
  const { prompt, attachments } = await request.json()
  
  // 1. Call all three models in parallel
  const responses = await Promise.all([
    callClaude(prompt, attachments),
    callGPT(prompt, attachments),
    callGemini(prompt, attachments)
  ])
  
  // 2. Synthesize responses
  const analysis = await synthesizeResponses(responses)
  
  // 3. Store in database (if user authenticated)
  if (userId) {
    await supabase.from('queries').insert({
      user_id: userId,
      prompt,
      mode: 'consensus',
      responses,
      analysis
    })
  }
  
  return NextResponse.json({ analysis })
}
```

### Phase 2: Divergence Mode (Month 2)

#### 2.1 Divergence Mapping Engine
```typescript
// lib/ai/divergence.ts
export function mapDivergences(
  responses: ModelResponses
): DivergenceAnalysis {
  // 1. Extract key concepts from each response
  const concepts = extractConcepts(responses)
  
  // 2. Compare concepts across models
  const comparisons = compareConceptsAcrossModels(concepts)
  
  // 3. Create node graph
  const nodes = createDivergenceNodes(comparisons)
  
  // 4. Calculate positions using force-directed layout
  const positions = calculateNodePositions(nodes)
  
  // 5. Generate connections
  const connections = generateConnections(nodes)
  
  return {
    nodes: nodes.map((n, i) => ({ ...n, position: positions[i] })),
    connections,
    clusters: identifyClusters(nodes),
    maxDivergence: calculateMaxDivergence(comparisons)
  }
}
```

#### 2.2 Interactive Graph Component
```typescript
// components/divergence/DivergenceGraph.tsx
export function DivergenceGraph({ analysis }: { analysis: DivergenceAnalysis }) {
  return (
    <div className="relative w-full h-screen bg-black">
      {/* Render connections */}
      {analysis.connections.map(conn => (
        <ConnectionLine key={conn.id} connection={conn} />
      ))}
      
      {/* Render nodes */}
      {analysis.nodes.map(node => (
        <DivergenceNode 
          key={node.id} 
          node={node}
          onClick={() => expandNode(node)}
        />
      ))}
      
      {/* Controls */}
      <DivergenceControls 
        onFilter={handleFilter}
        onZoom={handleZoom}
      />
    </div>
  )
}
```

### Phase 3: User Features (Future)

#### 3.1 Authentication Flow
```typescript
// Using Supabase Auth with Next.js App Router
// app/(app)/layout.tsx
export default async function AppLayout({ children }) {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    redirect('/login')
  }
  
  return (
    <div>
      <AppHeader user={session.user} />
      {children}
    </div>
  )
}
```

#### 3.2 Subscription Tiers
```typescript
// lib/stripe/config.ts
export const PRICING_TIERS = {
  free: {
    id: 'free',
    name: 'Explorer',
    price: 0,
    queries: 10, // per month
    features: ['Basic synthesis', 'Consensus mode only']
  },
  pro: {
    id: 'price_xxx', // Stripe price ID
    name: 'Researcher',
    price: 29,
    queries: 200,
    features: ['All modes', 'Export results', 'API access']
  },
  enterprise: {
    id: 'price_yyy',
    name: 'Enterprise',
    price: 'custom',
    queries: 'unlimited',
    features: ['Everything', 'Priority support', 'Custom models']
  }
}
```

## Implementation Phases

### Week 1: Foundation & Consensus Mode
- [ ] Set up Next.js project with Vercel boilerplate
- [ ] Configure API routes for all three AI models
- [ ] Build synthesis engine
- [ ] Create ConsensusView UI
- [ ] Implement alignment visualization
- [ ] Add file attachment support
- [ ] Dark theme styling
- [ ] Deploy to Vercel

### Week 2: Polish & Testing
- [ ] Personal testing and refinement
- [ ] Performance optimization
- [ ] Error handling
- [ ] Loading states
- [ ] Response caching
- [ ] Rate limiting

### Month 2: Divergence Mode
- [ ] Design divergence analysis algorithm
- [ ] Build interactive graph components
- [ ] Implement force-directed layout
- [ ] Add node interactions
- [ ] Create filtering system
- [ ] Export functionality

### Month 3: User Features
- [ ] Supabase authentication
- [ ] User dashboard
- [ ] Query history
- [ ] Stripe integration
- [ ] Usage tracking
- [ ] API access

## Design System

### Color Palette
```css
:root {
  /* Dark theme base */
  --background: 0 0% 3.9%;
  --foreground: 0 0% 98%;
  
  /* Brand colors */
  --consensus: 262 83% 58%;  /* Purple */
  --divergence: 346 77% 50%; /* Red */
  --agreement: 142 71% 45%; /* Green */
  
  /* Model colors */
  --claude: 262 52% 47%;
  --gpt: 158 64% 42%;
  --gemini: 217 91% 60%;
  
  /* UI colors */
  --muted: 0 0% 14.9%;
  --accent: 262 83% 58%;
  --border: 0 0% 14.9%;
}
```

### Component Library
- shadcn/ui for base components
- Framer Motion for animations
- Recharts for data visualization
- React Flow for divergence graph (optional)

## API Integration

### Model Endpoints
```typescript
// Centralized model configuration
export const AI_MODELS = {
  claude: {
    endpoint: '/api/ai/models/claude',
    model: 'claude-3-opus-20240229',
    maxTokens: 4000
  },
  gpt: {
    endpoint: '/api/ai/models/openai',
    model: 'gpt-4-turbo-preview',
    maxTokens: 4000
  },
  gemini: {
    endpoint: '/api/ai/models/gemini',
    model: 'gemini-pro',
    maxTokens: 4000
  }
}
```

### Rate Limiting Strategy
```typescript
// Using Upstash for rate limiting
export const rateLimits = {
  free: { requests: 10, window: '1 month' },
  pro: { requests: 200, window: '1 month' },
  api: { requests: 100, window: '1 hour' }
}
```

## Performance Optimization

### Caching Strategy
1. **Response Cache**: Cache AI responses for 24 hours
2. **Synthesis Cache**: Cache synthesis results for identical prompts
3. **Static Assets**: Use Next.js Image optimization
4. **API Routes**: Implement edge functions where possible

### Cost Management
```typescript
// Track token usage
export async function trackUsage(userId: string, tokens: number) {
  const cost = calculateCost(tokens)
  
  await supabase.from('usage').insert({
    user_id: userId,
    tokens,
    cost,
    timestamp: new Date().toISOString()
  })
  
  // Check if user exceeded limits
  await checkUsageLimits(userId)
}
```

## Security Considerations

1. **API Keys**: Store in environment variables
2. **Rate Limiting**: Implement per-user and per-IP limits
3. **Input Validation**: Sanitize all user inputs
4. **CORS**: Configure for production domain only
5. **Authentication**: Use Supabase Row Level Security

## Testing Strategy

### Unit Tests
- Synthesis algorithm accuracy
- Alignment calculations
- API response handling

### Integration Tests
- Full synthesis flow
- File upload handling
- Database operations

### E2E Tests
- User journey: Query → Synthesis → Results
- Mode switching
- Error scenarios

## Deployment

### Environment Variables
```env
# AI APIs
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# App
NEXT_PUBLIC_APP_URL=https://voiltail.com
```

### Vercel Configuration
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "app/api/ai/synthesize/route.ts": {
      "maxDuration": 60
    }
  }
}
```

## Success Metrics

### Phase 1 (Consensus Mode)
- Synthesis quality score > 85%
- Response time < 5 seconds
- Alignment accuracy > 90%

### Phase 2 (Divergence Mode)
- Node interaction smoothness
- Graph rendering < 1 second
- Meaningful divergence detection

### Phase 3 (Monetization)
- Free → Pro conversion > 5%
- Monthly recurring revenue
- User retention > 60%

## Appendix: Reusable Code from Current Project

### API Endpoints
```typescript
// Current gemini.ts - adapt for Next.js
import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { prompt, attachments } = await request.json()
  
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
  
  // ... rest of implementation
}
```

### File Handling
```typescript
// Reuse existing fileToBase64 utility
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const base64 = reader.result as string
      resolve(base64.split(',')[1])
    }
    reader.onerror = error => reject(error)
  })
}
```

## Next Steps

1. **Create Vercel project** with Next.js + Supabase boilerplate
2. **Clean boilerplate** - remove auth UI but keep configuration
3. **Port API endpoints** to Next.js API routes
4. **Build Consensus Mode** following this specification
5. **Test extensively** before moving to Divergence Mode

---

This TSD serves as the single source of truth for the Voiltail Debater project. All implementation decisions should align with this specification.
