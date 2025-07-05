# Voiltail Architecture Tiers

## Overview
Voiltail implements a tiered architecture that balances performance, cost, and quality based on user needs and subscription levels.

## Tier Comparison Matrix

| Feature | Express (Current) | Pro (Next Phase) | Premium (Future) |
|---------|------------------|------------------|------------------|
| **Synthesis Time** | 5-8 seconds | 15-25 seconds | 10-15 seconds |
| **Analysis Depth** | Rule-based | AI-powered | AI + Streaming |
| **Semantic Analysis** | Local keywords | OpenAI embeddings | Advanced embeddings |
| **Response Quality** | Good | Exceptional | Exceptional + Real-time |
| **Cost per Query** | $0.01-0.03 | $0.05-0.15 | $0.08-0.20 |
| **Vercel Plan Required** | Hobby (10s) | Pro (60s) | Pro (60s) |
| **User Authentication** | No | Yes | Yes |
| **Streaming Updates** | No | No | Yes |
| **Background Processing** | No | No | Yes |
| **Query History** | No | Yes | Yes |
| **API Access** | No | Limited | Full |

## Tier 1: Express Mode (Current Implementation)

### Target Users
- Developers testing the platform
- Casual researchers
- Cost-conscious users
- Hobby plan Vercel deployments

### Technical Implementation
```typescript
// Fast local semantic similarity
function calculateFastSemanticSimilarity(contents: string[]): number {
  // Keyword overlap calculation using Jaccard similarity
  // No external API calls
  // Processing time: ~100ms
}

// Rule-based synthesis
function createFastSynthesis(responses: ModelResponse[]): string {
  // Intelligent text combination based on alignment
  // No AI synthesis calls
  // Immediate response generation
}
```

### Architecture
- **Direct AI API Integration**: Calls Gemini, ChatGPT, Claude directly
- **Local Processing**: All analysis done locally without external APIs
- **Single Request Flow**: No internal HTTP routing
- **Optimized for Speed**: Prioritizes response time over depth

### Limitations
- Basic synthesis quality
- Limited semantic understanding
- No user accounts or history
- No advanced features

## Tier 2: Pro Mode (Next Phase Implementation)

### Target Users
- Professional researchers
- Content creators
- Businesses requiring quality analysis
- Users willing to pay for superior insights

### Technical Implementation
```typescript
// OpenAI embeddings semantic similarity
async function calculateSemanticSimilarity(contents: string[]): Promise<number> {
  // OpenAI text-embedding-3-small API calls
  // Vector similarity calculation with cosine distance
  // Processing time: ~2-5 seconds
}

// GPT-4 powered synthesis
async function createGPT4Synthesis(responses: ModelResponse[]): Promise<string> {
  // Intelligent analysis using GPT-4-turbo
  // Structured reasoning and synthesis
  // Processing time: ~10-15 seconds
}
```

### Architecture
- **Sophisticated AI Pipeline**: GPT-4 synthesis + OpenAI embeddings
- **User Authentication**: Supabase-based auth system
- **Subscription Management**: Stripe integration
- **Usage Tracking**: Query limits and billing
- **Enhanced Analysis**: True semantic understanding

### New Features
- User accounts and authentication
- Query history and saved sessions
- Subscription tiers and billing
- API access with rate limiting
- Advanced synthesis quality
- Export functionality

### Cost Structure
```
Base Models (per query):
- Gemini 1.5 Flash: ~$0.01
- ChatGPT-4: ~$0.03  
- Claude 3.5 Sonnet: ~$0.02

Pro Features (per query):
- OpenAI Embeddings: ~$0.0001
- GPT-4 Synthesis: ~$0.03

Total per query: ~$0.09
Monthly subscription: $29/month (200 queries)
```

## Tier 3: Premium Mode (Future Implementation)

### Target Users
- Enterprise customers
- High-volume researchers
- Users requiring real-time updates
- Advanced API consumers

### Technical Implementation
```typescript
// Streaming synthesis with real-time updates
export async function streamingSynthesize(prompt: string) {
  // WebSocket connection for real-time updates
  // Progressive synthesis enhancement
  // Background processing with live updates
}

// Background enhanced synthesis
export async function backgroundEnhancedSynthesis(prompt: string) {
  // Immediate fast response
  // Queue sophisticated analysis
  // WebSocket updates when complete
}
```

### Architecture
- **Hybrid Response System**: Fast initial + enhanced background
- **Real-time Streaming**: WebSocket-based live updates
- **Advanced Caching**: Intelligent response caching
- **Background Processing**: Queue-based enhancement
- **Enterprise Features**: Priority support, custom models

### New Features
- Streaming responses with real-time updates
- Background processing for enhanced analysis
- Advanced caching and optimization
- Priority processing queues
- Custom model integration
- Enterprise API access
- Advanced analytics and insights

### Performance Characteristics
- **Initial Response**: 3-5 seconds (fast synthesis)
- **Enhanced Response**: 10-15 seconds (background processing)
- **Real-time Updates**: Progressive enhancement via WebSocket
- **Caching**: Intelligent semantic similarity caching

## Implementation Roadmap

### Phase 1: Express Mode ✅ (Complete)
- [x] Fast rule-based synthesis
- [x] Direct AI API integration
- [x] Local semantic analysis
- [x] Production deployment
- [x] Basic UI/UX

### Phase 2: Pro Mode (Next 2-3 months)
- [ ] User authentication (Supabase)
- [ ] Subscription management (Stripe)
- [ ] Restore sophisticated synthesis
- [ ] Query history and management
- [ ] API access and rate limiting
- [ ] Enhanced UI for authenticated users

### Phase 3: Premium Mode (Future 6+ months)
- [ ] Streaming architecture design
- [ ] WebSocket implementation
- [ ] Background processing system
- [ ] Advanced caching layer
- [ ] Enterprise features
- [ ] Custom model integration

### Phase 4: Divergence Mode (Future 12+ months)
- [ ] Interactive knowledge graphs
- [ ] Advanced visualization
- [ ] Complex relationship mapping
- [ ] Multi-dimensional analysis

## Technical Considerations

### Vercel Deployment Requirements

#### Express Mode
- **Plan**: Hobby ($0/month)
- **Timeout**: 10 seconds (sufficient)
- **Memory**: 1024MB (sufficient)
- **Bandwidth**: Standard (sufficient)

#### Pro Mode
- **Plan**: Pro ($20/month)
- **Timeout**: 60 seconds (required for synthesis)
- **Memory**: 1024MB (sufficient)
- **Bandwidth**: Standard (sufficient)

#### Premium Mode
- **Plan**: Pro ($20/month) minimum
- **Timeout**: 60 seconds
- **Memory**: 3008MB (recommended for background processing)
- **Bandwidth**: Enhanced (for streaming)

### Database Schema Evolution

#### Express Mode
```sql
-- No database required
-- Stateless operation
```

#### Pro Mode
```sql
-- User management
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  subscription_tier TEXT,
  created_at TIMESTAMP
);

-- Query history
CREATE TABLE queries (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  prompt TEXT,
  analysis JSONB,
  created_at TIMESTAMP
);

-- Usage tracking
CREATE TABLE usage (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  queries_used INTEGER,
  period_start DATE,
  period_end DATE
);
```

#### Premium Mode
```sql
-- Add streaming and caching tables
CREATE TABLE cached_responses (
  id UUID PRIMARY KEY,
  prompt_hash TEXT,
  response JSONB,
  created_at TIMESTAMP
);

CREATE TABLE processing_queue (
  id UUID PRIMARY KEY,
  user_id UUID,
  prompt TEXT,
  status TEXT,
  created_at TIMESTAMP
);
```

## Migration Strategy

### Express → Pro Migration
1. **Preserve Express Mode**: Keep as fallback/free tier
2. **Add Authentication**: Implement Supabase auth
3. **Restore Sophisticated Synthesis**: Use archived files
4. **Add Billing**: Integrate Stripe subscriptions
5. **Gradual Rollout**: Feature flags for testing

### Pro → Premium Migration
1. **Implement Streaming**: WebSocket infrastructure
2. **Background Processing**: Queue system
3. **Advanced Caching**: Semantic similarity caching
4. **Performance Optimization**: Enhanced response times
5. **Enterprise Features**: Custom models, priority support

## Success Metrics

### Express Mode
- Response time < 8 seconds
- User engagement > 60%
- Error rate < 5%
- Conversion to Pro > 10%

### Pro Mode
- Response time < 25 seconds
- Synthesis quality score > 85%
- User retention > 70%
- Monthly recurring revenue growth
- API adoption rate

### Premium Mode
- Initial response < 5 seconds
- Enhanced response < 15 seconds
- Real-time update latency < 2 seconds
- Enterprise customer satisfaction > 90%
- Advanced feature adoption > 50%

---

**Last Updated**: July 5, 2025
**Current Tier**: Express Mode
**Next Implementation**: Pro Mode with sophisticated synthesis
