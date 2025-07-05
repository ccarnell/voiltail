import { NextResponse } from 'next/server';
import { synthesizeWithErrorHandling } from '@/lib/ai/synthesis';
import type { ModelResponse, FileAttachment } from '@/types/ai';

export async function POST(request: Request) {
  try {
    const { prompt, attachments } = await request.json();
    
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Valid prompt is required' },
        { status: 400 }
      );
    }

    // Validate environment variables
    const requiredKeys = ['GOOGLE_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY'];
    const missingKeys = requiredKeys.filter(key => !process.env[key]);
    
    if (missingKeys.length > 0) {
      return NextResponse.json(
        { error: `Missing API keys: ${missingKeys.join(', ')}` },
        { status: 500 }
      );
    }

    console.log('🚀 Starting synthesis for prompt:', prompt.substring(0, 100) + '...');

    // Call all three models in parallel
    const modelCalls = [
      callModel('gemini', prompt, attachments),
      callModel('openai', prompt, attachments),
      callModel('claude', prompt, attachments)
    ];
    
    const startTime = Date.now();
    const results = await Promise.allSettled(modelCalls);
    const totalTime = Date.now() - startTime;
    
    console.log(`⏱️ All model calls completed in ${totalTime}ms`);

    // Process results and handle failures gracefully
    const responses: ModelResponse[] = [];
    
    results.forEach((result, index) => {
      const modelName = ['gemini', 'openai', 'claude'][index] as 'gemini' | 'openai' | 'claude';
      
      if (result.status === 'fulfilled') {
        responses.push(result.value);
        console.log(`✅ ${modelName} succeeded in ${result.value.responseTime}ms`);
      } else {
        console.error(`❌ ${modelName} failed:`, result.reason);
        // Add error response so synthesis can still work with partial data
        responses.push({
          model: modelName,
          content: `Error: ${result.reason?.message || 'Unknown error occurred'}`,
          responseTime: 0
        });
      }
    });

    // Filter out error responses for synthesis (but keep at least one)
    const validResponses = responses.filter(r => !r.content.startsWith('Error:'));
    const responsesToSynthesize = validResponses.length > 0 ? validResponses : responses;
    
    console.log(`🧠 Synthesizing ${responsesToSynthesize.length} responses...`);

    // Synthesize the responses
    const analysis = await synthesizeWithErrorHandling(responsesToSynthesize);
    
    console.log(`✨ Synthesis complete with ${analysis.alignment.overallAlignment} alignment: ${analysis.alignment.description}`);

    return NextResponse.json({ 
      analysis,
      metadata: {
        totalTime,
        modelCount: responsesToSynthesize.length,
        hasErrors: responses.some(r => r.content.startsWith('Error:'))
      }
    });
  } catch (error) {
    console.error('Synthesis endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to synthesize responses' },
      { status: 500 }
    );
  }
}

async function callModel(
  model: 'gemini' | 'openai' | 'claude',
  prompt: string,
  attachments?: FileAttachment[]
): Promise<ModelResponse> {
  const startTime = Date.now();
  
  try {
    // Use localhost directly to avoid CORS issues
    const response = await fetch(`http://localhost:3000/api/ai/models/${model}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, attachments: attachments || [] })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;
    
    return {
      model,
      content: data.response || 'No response received',
      responseTime
    };
  } catch (error) {
    throw new Error(`${model} API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
