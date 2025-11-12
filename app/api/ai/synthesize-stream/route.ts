import { NextRequest } from 'next/server';
import { synthesizeWithErrorHandling } from '@/lib/ai/synthesis';
import { persistentCostTracker } from '@/lib/persistent-cost-tracking';
import { resultStorage } from '@/lib/result-storage';
import type { ModelResponse, FileAttachment } from '@/types/ai';

export async function POST(request: NextRequest) {
  const { prompt, mode = 'pro', attachments } = await request.json();
  
  if (mode !== 'pro') {
    return new Response('Streaming only available for Pro mode', { status: 400 });
  }
  
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      synthesizeWithStreaming(prompt, attachments, controller, encoder);
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

// Helper function to safely encode JSON for SSE
function safeJsonStringify(obj: Record<string, unknown>): string {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'string') {
      // Replace problematic characters that can break JSON
      return value
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\r/g, '\\r')
        .replace(/\n/g, '\\n')
        .replace(/\t/g, '\\t')
        .replace(/\f/g, '\\f')
        .replace(/\b/g, '\\b');
    }
    return value;
  });
}

async function synthesizeWithStreaming(
  prompt: string,
  attachments: FileAttachment[] | undefined,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  const startTime = Date.now();
  
  try {
    // Send start event
    controller.enqueue(encoder.encode(`data: ${safeJsonStringify({ 
      type: 'started',
      message: 'Starting sophisticated synthesis...',
      progress: 0
    })}\n\n`));
    
    // Call models in parallel with progress tracking
    const modelPromises = [
      callModelWithProgress('gemini', prompt, attachments),
      callModelWithProgress('openai', prompt, attachments),
      callModelWithProgress('claude', prompt, attachments)
    ];
    
    const responses: ModelResponse[] = [];
    
    // Stream results as they complete
    for (const [index, promise] of modelPromises.entries()) {
      try {
        const response = await promise;
        responses.push(response);
        
        const modelName = ['Gemini', 'OpenAI', 'Claude'][index];
        const safeContent = response.content.substring(0, 200).replace(/[\r\n\t]/g, ' ') + '...';
        controller.enqueue(encoder.encode(`data: ${safeJsonStringify({
          type: 'model_complete',
          model: response.model,
          modelName,
          content: safeContent,
          responseTime: response.responseTime,
          progress: Math.round(((index + 1) / 3) * 60)
        })}\n\n`));
      } catch (error) {
        console.error(`Model ${index} failed:`, error);
        const modelName = ['gemini', 'openai', 'claude'][index] as 'gemini' | 'openai' | 'claude';
        
        // Add error response but continue with other models
        responses.push({
          model: modelName,
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
          responseTime: 0
        });
        
        controller.enqueue(encoder.encode(`data: ${safeJsonStringify({
          type: 'model_error',
          model: modelName,
          error: error instanceof Error ? error.message : 'Unknown error',
          progress: Math.round(((index + 1) / 3) * 60)
        })}\n\n`));
      }
    }
    
    if (responses.length === 0) {
      throw new Error('All models failed');
    }
    
    // Filter out error responses for synthesis (but keep at least one)
    const validResponses = responses.filter(r => !r.content.startsWith('Error:'));
    const responsesToSynthesize = validResponses.length > 0 ? validResponses : responses;
    
    // Embeddings phase
    controller.enqueue(encoder.encode(`data: ${safeJsonStringify({
      type: 'embeddings_started',
      message: 'Calculating semantic similarity with OpenAI embeddings...',
      progress: 70
    })}\n\n`));

    // Small delay to show embeddings progress
    await new Promise(resolve => setTimeout(resolve, 1000));

    controller.enqueue(encoder.encode(`data: ${safeJsonStringify({
      type: 'embeddings_progress',
      message: 'Computing vector similarities...',
      progress: 80
    })}\n\n`));

    // Synthesis phase
    controller.enqueue(encoder.encode(`data: ${safeJsonStringify({
      type: 'synthesis_started',
      message: 'Creating unified synthesis with GPT-4...',
      progress: 85
    })}\n\n`));
    
    // Perform sophisticated synthesis
    const analysis = await synthesizeWithErrorHandling(responsesToSynthesize);
    
    // Track costs and performance
    const finalTime = Date.now() - startTime;
    const cost = persistentCostTracker.trackQuery('pro', finalTime);
    
    // Store the result and send completion event with better logging
    const resultId = resultStorage.store(analysis);
    console.log(`🎯 Synthesis complete, stored result ${resultId}`);
    
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
      type: 'synthesis_complete',
      progress: 100,
      resultId,
      metadata: {
        totalModels: responses.length,
        successfulModels: validResponses.length,
        hasErrors: responses.some(r => r.content.startsWith('Error:')),
        estimatedCost: cost.total,
        processingTime: finalTime
      }
    })}\n\n`));

  } catch (error) {
    console.error('Streaming synthesis error:', error);
    controller.enqueue(encoder.encode(`data: ${safeJsonStringify({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    })}\n\n`));
  } finally {
    controller.close();
  }
}

// Helper function to call individual models with progress tracking
async function callModelWithProgress(
  model: 'gemini' | 'openai' | 'claude',
  prompt: string,
  attachments?: FileAttachment[]
): Promise<ModelResponse> {
  const startTime = Date.now();
  
  try {
    let content: string;
    
    if (model === 'openai') {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
      
      const userContent: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = [];
      userContent.push({ type: 'text', text: prompt });
      
      if (attachments && attachments.length > 0) {
        attachments.forEach((attachment) => {
          if (attachment.type === 'image') {
            userContent.push({
              type: 'image_url',
              image_url: {
                url: `data:${attachment.mimeType};base64,${attachment.base64}`
              }
            });
          }
        });
      }
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: userContent }],
        max_tokens: 4000,
      });
      
      content = completion.choices[0]?.message?.content || 'No response';
      
    } else if (model === 'gemini') {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
      const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-8b' });
      
      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
      parts.push({ text: prompt });
      
      if (attachments && attachments.length > 0) {
        attachments.forEach((attachment) => {
          if (attachment.type === 'image') {
            parts.push({
              inlineData: {
                mimeType: attachment.mimeType,
                data: attachment.base64
              }
            });
          }
        });
      }
      
      const result = await geminiModel.generateContent(parts);
      const response = await result.response;
      content = response.text();
      
    } else { // claude
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
      
      const messageContent: Array<{ type: 'text'; text: string } | { type: 'image'; source: { type: 'base64'; media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'; data: string } }> = [];
      messageContent.push({ type: 'text', text: prompt });
      
      if (attachments && attachments.length > 0) {
        attachments.forEach((attachment) => {
          if (attachment.type === 'image') {
            const mediaType = attachment.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
            messageContent.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: attachment.base64
              }
            });
          }
        });
      }
      
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: messageContent }]
      });
      
      content = response.content[0]?.type === 'text' 
        ? response.content[0].text 
        : 'No response';
    }
    
    const responseTime = Date.now() - startTime;
    
    return {
      model,
      content,
      responseTime
    };
  } catch (error) {
    throw new Error(`${model} API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
