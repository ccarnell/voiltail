# Voiltail - Complete Implementation Guide

## Overview

This guide provides a comprehensive roadmap for implementing Voiltail's sophisticated synthesis capabilities with a sustainable freemium business model. The implementation is divided into four phases, each with built-in tripwire checkpoints to ensure strategic alignment and risk mitigation.

## Architecture Summary

**Basic Tier**: $5 base + $1 per query (Current synthesis with cost offset)
**Pro Tier**: TBD after validation (Sophisticated synthesis with GPT-4 + embeddings + streaming)
**Enterprise Tier**: Future custom pricing (API access, priority support)

## Tripwire Checkpoint System

At the beginning of each phase, we will execute this comprehensive analysis:

**🔄 TRIPWIRE CHECKPOINT**
*"Please stop. Pause. Inhale with a deep breath. As you exhale, open up your mind to our overall project (both technical and operations). Ask yourself if we are implementing the correct features in the correct order. Ask yourself what issues we could potentially run in to. Ask yourself why those could potentially be issues. If they have anything to do with our current plan, consider how we should update our plan. If they are things we could run into, consider what our contingency plans should be. Ask yourself from both a high-level view of our project and each individual feature that you and I will be implementing, what the second- and third-order consequences could be that we have not take into consideration. Are any of those things critical enough that we should update our plan? Why? If it critical enough, we should update our plan.*

*Now pause again. You have thought through what our current plan is, the effects of our implementation, and you have addressed potential issues or oversights we have not considered so far. Now I want you to place yourself at the end of the last phase of with everything completed. Take a look back and ask yourself if we should have done anything differently, if we missed something, if anything is wrong, or there are considerations we should have made that we did not. Let's address all of these now before we crystallize our plan."*

---

# PHASE 1: CORE VALIDATION

## 🔄 TRIPWIRE CHECKPOINT
The Tripwire Checkpoint has already been completed for Phase 1.

## Objective
Validate that sophisticated synthesis with streaming works reliably and cost-effectively before building any payment or authentication infrastructure.

## Success Criteria
- [ ] Sophisticated synthesis completes reliably in <50 seconds
- [ ] Streaming provides smooth real-time updates with no connection issues
- [ ] Cost per sophisticated query is measurable and <$0.15
- [ ] Quality improvement over basic synthesis is significant and noticeable
- [ ] Error rate is <2% across 100+ test queries

## Implementation Steps

### Step 1: Restore Sophisticated Synthesis Engine

**Files to Create/Modify:**
- `lib/ai/embeddings.ts` (restore from archive)
- `lib/ai/gpt-synthesis.ts` (restore from archive)
- `lib/ai/synthesis-sophisticated.ts` (new file)

**1.1 Restore OpenAI Embeddings**
```typescript
// lib/ai/embeddings.ts
export async function getOpenAIEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float'
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI embedding API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error getting OpenAI embedding:', error);
    throw error;
  }
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

export async function calculateSemanticSimilarity(texts: string[]): Promise<number> {
  try {
    const embeddings = await Promise.all(
      texts.map(text => getOpenAIEmbedding(text))
    );

    const similarities: number[] = [];
    
    for (let i = 0; i < embeddings.length; i++) {
      for (let j = i + 1; j < embeddings.length; j++) {
        const similarity = cosineSimilarity(embeddings[i], embeddings[j]);
        similarities.push(similarity);
      }
    }

    return similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
  } catch (error) {
    console.error('Error calculating semantic similarity:', error);
    return 0.5; // Fallback value
  }
}
```

**1.2 Restore GPT-4 Synthesis**
```typescript
// lib/ai/gpt-synthesis.ts
import type { ModelResponse } from '@/types/ai';

export async function createGPT4Synthesis(
  responses: ModelResponse[],
  alignmentData: { semantic: number }
): Promise<string> {
  try {
    const synthesisPrompt = createSynthesisPrompt(responses, alignmentData);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert research synthesizer. Your job is to analyze multiple AI responses and create a unified synthesis that combines the best insights from each response.

Guidelines:
- Identify areas of agreement and disagreement
- Combine complementary insights
- Note any contradictions or varying perspectives
- Create a balanced, comprehensive answer
- Maintain the collective intelligence of all models
- Use clear, professional language
- Structure the response logically`
          },
          {
            role: 'user',
            content: synthesisPrompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`GPT-4 synthesis API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Unable to generate synthesis';
  } catch (error) {
    console.error('Error creating GPT-4 synthesis:', error);
    return createFallbackSynthesis(responses);
  }
}

function createSynthesisPrompt(
  responses: ModelResponse[],
  alignmentData: { semantic: number }
): string {
  const alignmentContext = alignmentData.semantic > 0.8 
    ? 'Models show strong agreement in both meaning and expression'
    : alignmentData.semantic > 0.6
    ? 'Models show partial agreement with some complementary perspectives'
    : 'Models provide diverse perspectives that may complement each other';
  
  return `Please synthesize these three AI model responses into a unified, comprehensive answer:

**Alignment Analysis**: ${alignmentContext}

**Response 1 (Gemini)**:
${responses.find(r => r.model === 'gemini')?.content || 'No response'}

**Response 2 (OpenAI)**:
${responses.find(r => r.model === 'openai')?.content || 'No response'}

**Response 3 (Claude)**:
${responses.find(r => r.model === 'claude')?.content || 'No response'}

**Instructions**:
1. Create a synthesis that represents the collective intelligence of all three models
2. Highlight areas where models agree and complement each other
3. Address any contradictions or different perspectives
4. Provide a balanced, comprehensive response
5. Structure the answer clearly and logically

**Synthesis**:`;
}

function createFallbackSynthesis(responses: ModelResponse[]): string {
  const intro = 'Based on analysis from multiple AI models, here is a synthesis of their responses:';
  
  const sections = responses.map((response) => {
    const modelName = response.model.charAt(0).toUpperCase() + response.model.slice(1);
    return `**${modelName} Perspective**: ${response.content.substring(0, 200)}...`;
  });
  
  const conclusion = 'This synthesis combines insights from multiple AI models to provide a comprehensive perspective.';
  
  return [intro, '', ...sections, '', conclusion].join('\n');
}
```

**1.3 Create Sophisticated Synthesis Engine**
```typescript
// lib/ai/synthesis-sophisticated.ts
import type { ModelResponse, ConsensusAnalysis, AlignedPoint, DivergentSection, AlignmentData } from '@/types/ai';
import { calculateSemanticSimilarity } from './embeddings';
import { createGPT4Synthesis } from './gpt-synthesis';

export async function sophisticatedSynthesis(
  responses: ModelResponse[]
): Promise<ConsensusAnalysis> {
  const startTime = Date.now();
  
  try {
    // Calculate semantic similarity using OpenAI embeddings
    const semantic = await calculateSemanticSimilarity(
      responses.map(r => r.content)
    );
    
    // Calculate surface-level similarity
    const surface = calculateJaccardSimilarity(responses.map(r => r.content));
    
    // Create GPT-4 powered synthesis
    const unifiedResponse = await createGPT4Synthesis(responses, { semantic });
    
    // Calculate advanced alignment
    const alignment = calculateAdvancedAlignment(responses, semantic, surface);
    
    // Find divergences
    const divergences = findAdvancedDivergences(responses);
    
    const processingTime = Date.now() - startTime;
    console.log(`Sophisticated synthesis completed in ${processingTime}ms`);
    
    return {
      unifiedResponse,
      alignment,
      alignedPoints: alignment.alignedPoints,
      divergentSections: divergences,
      originalResponses: responses
    };
  } catch (error) {
    console.error('Sophisticated synthesis error:', error);
    throw error;
  }
}

function calculateJaccardSimilarity(texts: string[]): number {
  const wordSets = texts.map(text => 
    new Set(
      text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2)
    )
  );

  const intersection = new Set(
    [...wordSets[0]].filter(word => 
      wordSets.every(set => set.has(word))
    )
  );

  const union = new Set(
    wordSets.flatMap(set => [...set])
  );

  return union.size > 0 ? intersection.size / union.size : 0;
}

function calculateAdvancedAlignment(
  responses: ModelResponse[],
  semantic: number,
  surface: number
): AlignmentData {
  const getAlignmentLevel = (score: number): 'high' | 'moderate' | 'low' => {
    if (score > 0.7) return 'high';
    if (score > 0.4) return 'moderate';
    return 'low';
  };
  
  const overallLevel = getAlignmentLevel(semantic * 0.7 + surface * 0.3);
  
  const alignedPoints: AlignedPoint[] = [];
  
  if (semantic > 0.8) {
    alignedPoints.push({
      content: "Models show strong semantic agreement on core concepts",
      models: responses.map(r => r.model),
      strength: semantic
    });
  }
  
  if (semantic > 0.6 && surface > 0.2) {
    alignedPoints.push({
      content: "Models demonstrate consensus on key terminology and approach",
      models: responses.map(r => r.model),
      strength: (semantic + surface) / 2
    });
  }
  
  const getDescription = (semanticScore: number, surfaceScore: number): string => {
    if (semanticScore > 0.8 && surfaceScore > 0.3) {
      return 'Strong semantic alignment with consistent expression';
    } else if (semanticScore > 0.8 && surfaceScore <= 0.3) {
      return 'Strong semantic alignment with diverse expression styles';
    } else if (semanticScore > 0.6) {
      return 'Moderate semantic alignment with complementary perspectives';
    } else if (surfaceScore > 0.3) {
      return 'Similar language usage but potentially different underlying concepts';
    } else {
      return 'Diverse perspectives with low alignment - models offer complementary insights';
    }
  };
  
  return {
    semantic,
    surface,
    gemini: getAlignmentLevel(semantic * 0.95),
    chatgpt: getAlignmentLevel(semantic * 1.05),
    claude: getAlignmentLevel(semantic),
    overallAlignment: overallLevel,
    description: getDescription(semantic, surface),
    methodology: 'semantic-similarity-v2',
    alignedPoints: alignedPoints
  };
}

function findAdvancedDivergences(responses: ModelResponse[]): DivergentSection[] {
  const divergences: DivergentSection[] = [];
  
  // Check for significant length differences
  const lengths = responses.map(r => r.content.length);
  const avgLength = lengths.reduce((a, b) => a + b) / lengths.length;
  const maxLength = Math.max(...lengths);
  const minLength = Math.min(...lengths);
  
  if (maxLength > avgLength * 1.3 || minLength < avgLength * 0.7) {
    divergences.push({
      topic: "Response Detail Level",
      content: "Models provided different levels of detail in their responses",
      models: responses.map(r => r.model),
      description: "Models showed varying perspectives on implementation"
    });
  }
  
  // Check for different response styles
  const formalityScores = responses.map(r => calculateFormality(r.content));
  const formalityRange = Math.max(...formalityScores) - Math.min(...formalityScores);
  
  if (formalityRange > 0.2) {
    divergences.push({
      topic: "Communication Style",
      content: "Models adopted different communication approaches",
      models: responses.map(r => r.model),
      description: "Varying levels of formality and technical depth in responses"
    });
  }
  
  return divergences;
}

function calculateFormality(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / sentences.length;
  
  const technicalTerms = ['algorithm', 'implementation', 'methodology', 'analysis', 'framework', 'approach'];
  const technicalCount = technicalTerms.reduce((count, term) => 
    count + (text.toLowerCase().includes(term) ? 1 : 0), 0
  );
  
  return Math.min(1, (avgSentenceLength / 20) + (technicalCount / 10));
}
```

### Step 2: Implement Streaming Architecture

**2.1 Create Streaming Synthesis Endpoint**
```typescript
// app/api/ai/synthesize-stream/route.ts
import { NextRequest } from 'next/server';
import { sophisticatedSynthesis } from '@/lib/ai/synthesis-sophisticated';
import type { ModelResponse } from '@/types/ai';

export async function POST(request: NextRequest) {
  const { prompt, tier = 'basic' } = await request.json();
  
  if (tier !== 'pro') {
    return new Response('Streaming only available for Pro tier', { status: 400 });
  }
  
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      synthesizeWithStreaming(prompt, controller, encoder);
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

async function synthesizeWithStreaming(
  prompt: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  try {
    // Send start event
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
      type: 'started',
      message: 'Starting sophisticated synthesis...',
      progress: 0
    })}\n\n`));
    
    // Call models in parallel
    const modelPromises = [
      callModel('gemini', prompt),
      callModel('openai', prompt),
      callModel('claude', prompt)
    ];
    
    const responses: ModelResponse[] = [];
    
    // Stream results as they complete
    for (const [index, promise] of modelPromises.entries()) {
      try {
        const response = await promise;
        responses.push(response);
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'model_complete',
          model: response.model,
          content: response.content.substring(0, 200) + '...',
          progress: Math.round(((index + 1) / 3) * 60)
        })}\n\n`));
      } catch (error) {
        console.error(`Model ${index} failed:`, error);
        // Continue with other models
      }
    }
    
    if (responses.length === 0) {
      throw new Error('All models failed');
    }
    
    // Embeddings phase
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
      type: 'embeddings_started',
      message: 'Calculating semantic similarity...',
      progress: 70
    })}\n\n`));
    
    // Synthesis phase
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
      type: 'synthesis_started',
      message: 'Creating unified synthesis...',
      progress: 85
    })}\n\n`));
    
    // Perform sophisticated synthesis
    const analysis = await sophisticatedSynthesis(responses);
    
    // Send final result
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
      type: 'synthesis_complete',
      analysis,
      progress: 100
    })}\n\n`));
    
  } catch (error) {
    console.error('Streaming synthesis error:', error);
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    })}\n\n`));
  } finally {
    controller.close();
  }
}

// Helper function to call individual models
async function callModel(
  model: 'gemini' | 'openai' | 'claude',
  prompt: string
): Promise<ModelResponse> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`/api/ai/models/${model}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    
    if (!response.ok) {
      throw new Error(`${model} API call failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      model,
      content: data.response || 'No response',
      responseTime: Date.now() - startTime
    };
  } catch (error) {
    throw new Error(`${model} API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
```

### Step 3: Add Pro Mode Toggle to UI

**3.1 Update Consensus Page**
```typescript
// app/consensus/page.tsx - Add these additions to existing file

// Add to imports
import { Switch } from '@/components/ui/switch';

// Add to component state
const [synthesisMode, setSynthesisMode] = useState<'basic' | 'pro'>('basic');
const [streamingResults, setStreamingResults] = useState<any>(null);

// Add Pro mode toggle in the input area (before the form)
<div className="max-w-4xl mx-auto mb-4">
  <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700">
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Switch 
          checked={synthesisMode === 'pro'}
          onCheckedChange={(checked) => setSynthesisMode(checked ? 'pro' : 'basic')}
        />
        <label className="text-sm font-medium">
          {synthesisMode === 'pro' ? 'Pro Mode' : 'Basic Mode'}
        </label>
      </div>
      
      {synthesisMode === 'pro' && (
        <div className="flex items-center gap-2 text-xs text-amber-400">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
          </svg>
          <span>Advanced synthesis with GPT-4 + embeddings</span>
        </div>
      )}
    </div>
    
    <div className="text-xs text-gray-400">
      {synthesisMode === 'basic' 
        ? 'Fast synthesis • $5 base + $1/query' 
        : 'Sophisticated synthesis • Streaming updates'
      }
    </div>
  </div>
</div>

// Update handleSubmit function to handle streaming
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!prompt.trim() || isLoading) return;

  const currentPrompt = prompt;
  setPrompt('');
  setIsLoading(true);
  setError(null);

  try {
    if (synthesisMode === 'pro') {
      // Use streaming for Pro mode
      await handleStreamingSynthesis(currentPrompt);
    } else {
      // Use existing basic synthesis
      await handleBasicSynthesis(currentPrompt);
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'An error occurred');
    setPrompt(currentPrompt);
  } finally {
    setIsLoading(false);
  }
};

// Add streaming synthesis handler
const handleStreamingSynthesis = async (currentPrompt: string) => {
  const eventSource = new EventSource('/api/ai/synthesize-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: currentPrompt, tier: 'pro' })
  });

  let streamingResult: any = {
    prompt: currentPrompt,
    progress: 0,
    models: {},
    showDetails: false
  };

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    switch (data.type) {
      case 'started':
        streamingResult.progress = data.progress;
        setStreamingResults({ ...streamingResult });
        break;
        
      case 'model_complete':
        streamingResult.models[data.model] = data.content;
        streamingResult.progress = data.progress;
        setStreamingResults({ ...streamingResult });
        break;
        
      case 'synthesis_complete':
        setConversations(prev => [...prev, {
          prompt: currentPrompt,
          analysis: data.analysis,
          showDetails: false
        }]);
        setStreamingResults(null);
        eventSource.close();
        break;
        
      case 'error':
        setError(data.error);
        setStreamingResults(null);
        eventSource.close();
        break;
    }
  };

  eventSource.onerror = () => {
    setError('Streaming connection failed');
    setStreamingResults(null);
    eventSource.close();
  };
};

// Add streaming progress display (in the chat area)
{streamingResults && (
  <div className="w-full mb-6">
    <Card className="bg-gray-900/50 border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-4">
        <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
        <span className="text-gray-300">Sophisticated synthesis in progress...</span>
      </div>
      
      <div className="space-y-3">
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className="bg-cyan-400 h-2 rounded-full transition-all duration-300"
            style={{ width: `${streamingResults.progress}%` }}
          />
        </div>
        
        <div className="text-sm text-gray-400">
          Progress: {streamingResults.progress}%
        </div>
        
        {Object.keys(streamingResults.models).length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-300">Models completed:</div>
            {Object.entries(streamingResults.models).map(([model, content]) => (
              <div key={model} className="text-xs text-gray-400">
                ✓ {model.charAt(0).toUpperCase() + model.slice(1)}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  </div>
)}
```

### Step 4: Cost Tracking and Validation

**4.1 Create Cost Tracking System**
```typescript
// lib/cost-tracking.ts
interface QueryCost {
  timestamp: number;
  tier: 'basic' | 'pro';
  models: {
    gemini: number;
    openai: number;
    claude: number;
  };
  synthesis: {
    embeddings?: number;
    gpt4?: number;
  };
  total: number;
}

class CostTracker {
  private costs: QueryCost[] = [];
  
  // Estimated costs per model (in USD)
  private readonly MODEL_COSTS = {
    gemini: 0.01,
    openai: 0.03,
    claude: 0.02,
    embeddings: 0.0001,
    gpt4_synthesis: 0.04
  };
  
  trackQuery(tier: 'basic' | 'pro', processingTime: number): QueryCost {
    const cost: QueryCost = {
      timestamp: Date.now(),
      tier,
      models: {
        gemini: this.MODEL_COSTS.gemini,
        openai: this.MODEL_COSTS.openai,
        claude: this.MODEL_COSTS.claude,
      },
      synthesis: {},
      total: 0
    };
    
    // Add synthesis costs for Pro tier
    if (tier === 'pro') {
      cost.synthesis.embeddings = this.MODEL_COSTS.embeddings;
      cost.synthesis.gpt4 = this.MODEL_COSTS.gpt4_synthesis;
    }
    
    // Calculate total
    cost.total = Object.values(cost.models).reduce((sum, cost) => sum + cost, 0) +
                 Object.values(cost.synthesis).reduce((sum, cost) => sum + cost, 0);
    
    this.costs.push(cost);
    
    console.log(`Query cost tracked: ${tier} tier = $${cost.total.toFixed(4)}`);
    
    return cost;
  }
  
  getAverageCost(tier: 'basic' | 'pro', days: number = 7): number {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const recentCosts = this.costs.filter(c => c.timestamp > cutoff && c.tier === tier);
    
    if (recentCosts.length === 0) return 0;
    
    const total = recentCosts.reduce((sum, cost) => sum + cost.total, 0);
    return total / recentCosts.length;
  }
  
  getTotalCosts(days: number = 30): { basic: number; pro: number; total: number } {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const recentCosts = this.costs.filter(c => c.timestamp > cutoff);
    
    const basicTotal = recentCosts.filter(c => c.tier === 'basic').reduce((sum, c) => sum + c.total, 0);
    const proTotal = recentCosts.filter(c => c.tier === 'pro').reduce((sum, c) => sum + c.total, 0);
    
    return {
      basic: basicTotal,
      pro: proTotal,
      total: basicTotal + proTotal
    };
  }
  
  exportCostData(): QueryCost[] {
    return [...this.costs];
  }
}

export const costTracker = new CostTracker();
```

**4.2 Integrate Cost Tracking**
```typescript
// Update app/api/ai/synthesize/route.ts to include cost tracking
import { costTracker } from '@/lib/cost-tracking';

// Add to the synthesis endpoint
export async function POST(request: Request) {
  const startTime = Date.now();
  
  try {
    // ... existing synthesis logic ...
    
    // Track costs
    const processingTime = Date.now() - startTime;
    const cost = costTracker.trackQuery('basic', processingTime);
    
    return NextResponse.json({ 
      analysis,
      metadata: {
        totalTime: processingTime,
        estimatedCost: cost.total,
        modelCount: responsesToSynthesize.length
      }
    });
  } catch (error) {
    // ... error handling ...
  }
}
```

### Step 5: Testing and Validation

**5.1 Create Test Suite**
```typescript
// tests/synthesis-validation.test.ts
import { sophisticatedSynthesis } from '@/lib/ai/synthesis-sophisticated';
import { costTracker } from '@/lib/cost-tracking';

describe('Sophisticated Synthesis Validation', () => {
  const testPrompts = [
    "What are the key differences between React and Vue.js?",
    "Explain quantum computing in simple terms",
    "How does machine learning differ from traditional programming?",
    "What are the pros and cons of microservices architecture?",
    "Describe the impact of climate change on global economics"
  ];

  test('Sophisticated synthesis completes within time limit', async () => {
    for (const prompt of testPrompts) {
      const startTime = Date.now();
      
      // Mock model responses for testing
      const mockResponses = [
        { model: 'gemini', content: `Gemini response to: ${prompt}`, responseTime: 2000 },
        { model: 'openai', content: `OpenAI response to: ${prompt}`, responseTime: 3000 },
        { model: 'claude', content: `Claude response to: ${prompt}`, responseTime: 2500 }
      ];
      
      const result = await sophisticatedSynthesis(mockResponses);
      const totalTime = Date.now() - startTime;
      
      expect(totalTime).toBeLessThan(50000); // 50 seconds
      expect(result.unifiedResponse).toBeTruthy();
      expect(result.alignment).toBeTruthy();
    }
  });

  test('Cost tracking works correctly', () => {
    const cost = costTracker.trackQuery('pro', 30000);
    
    expect(cost.total).toBeGreaterThan(0);
    expect(cost.tier).toBe('pro');
    expect(cost.synthesis.embeddings).toBeDefined();
    expect(cost.synthesis.gpt4).toBeDefined();
  });
});
```

**5.2 Manual Testing Checklist**
- [ ] Test sophisticated synthesis with various prompt complexities
- [ ] Verify streaming updates work smoothly
- [ ] Measure actual costs vs estimates
- [ ] Test error handling and fallbacks
- [ ] Validate quality improvement over basic synthesis
- [ ] Test timeout scenarios
- [ ] Verify UI toggle works correctly

## Phase 1 User Requirements

### [[[(((XXX!!!NEED USER INPUT HERE!!!XXX)))]]

**Environment Variables Required:**
Add these to your `.env.local` file:
```env
# Existing variables (should already be set)
GOOGLE_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key  
ANTHROPIC_API_KEY=your-claude-api-key

# No additional variables needed for Phase 1
```

**Manual Testing Required:**
1. Test sophisticated synthesis with complex prompts
2. Verify streaming works in browser
3. Monitor console for cost tracking logs
4. Compare quality between basic and pro modes
5. Test error scenarios (API failures, timeouts)

---

# PHASE 2: ENHANCED USER EXPERIENCE

## 🔄 TRIPWIRE CHECKPOINT
Execute the comprehensive analysis before proceeding with Phase 2.

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

## Phase 2 User Requirements

### [[[(((XXX!!!NEED USER INPUT HERE!!!XXX)))]]

**No additional environment variables or external services required for Phase 2.**

**Manual Testing Required:**
1. Test local storage functionality across browser sessions
2. Verify usage tracking and cost calculation
3. Test error boundary with intentional errors
4. Verify upgrade modals appear at appropriate times
5. Test data persistence and cleanup

---

# PHASE 3: PAYMENT INTEGRATION

## 🔄 TRIPWIRE CHECKPOINT
Execute the comprehensive analysis before proceeding with Phase 3.

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
import { localStorageManager } from '@/lib/local-storage';

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

---

# PHASE 4: FULL PRODUCTION SYSTEM

## 🔄 TRIPWIRE CHECKPOINT
Execute the comprehensive analysis before proceeding with Phase 4.

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

**3.1 Sentry Configuration**
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

**3.2 PostHog Configuration**
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

**4.1 Email Configuration**
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

**4.2 Email Templates**
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

**4.3 Email Service**
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

**5.1 Rate Limiting Configuration**
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

**5.2 Rate Limiting Middleware**
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

---

# DEPLOYMENT CHECKLIST

## Pre-Deployment

- [ ] All environment variables configured
- [ ] Database migrations run successfully
- [ ] Stripe webhooks configured and tested
- [ ] Email templates tested and domain verified
- [ ] Rate limiting tested with different scenarios
- [ ] Error monitoring configured
- [ ] Analytics tracking implemented

## Production Deployment

- [ ] Deploy to Vercel with Pro plan
- [ ] Update all callback URLs to production domain
- [ ] Test complete user flow end-to-end
- [ ] Monitor error rates and performance
- [ ] Verify billing and subscription flows
- [ ] Test email delivery in production

## Post-Deployment

- [ ] Monitor system performance and costs
- [ ] Track user conversion rates
- [ ] Monitor API usage and rate limiting
- [ ] Review error logs and fix issues
- [ ] Gather user feedback and iterate

---

# MAINTENANCE AND MONITORING

## Daily Tasks
- Monitor error rates in Sentry
- Check API costs and usage
- Review user feedback and support requests

## Weekly Tasks
- Analyze user conversion metrics in PostHog
- Review subscription and billing reports
- Update cost tracking and pricing if needed

## Monthly Tasks
- Review and optimize database performance
- Analyze user retention and churn
- Plan feature improvements based on usage data

---

This completes the comprehensive implementation guide for Voiltail. The plan provides a clear path from the current basic system to a full production SaaS with sophisticated synthesis capabilities, proper authentication, billing, and monitoring.
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
