import { NextResponse } from 'next/server';
import { synthesizeWithErrorHandling } from '@/lib/ai/synthesis';
import { persistentCostTracker } from '@/lib/persistent-cost-tracking';
import type { ModelResponse, FileAttachment } from '@/types/ai';

export async function POST(request: Request) {
  try {
    const { prompt, attachments, mode = 'pro' } = await request.json();
    
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
    console.log(`🔧 Using ${mode} mode synthesis`);

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
    
    // Track costs and performance
    const finalTime = Date.now() - startTime;
    const cost = persistentCostTracker.trackQuery(mode as 'basic' | 'pro', finalTime);
    
    console.log(`✨ Synthesis complete with ${analysis.alignment.overallAlignment} alignment: ${analysis.alignment.description}`);

    return NextResponse.json({ 
      analysis,
      metadata: {
        totalTime: finalTime,
        modelCount: responsesToSynthesize.length,
        hasErrors: responses.some(r => r.content.startsWith('Error:')),
        estimatedCost: cost.total
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
      const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
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
            // Ensure media_type is one of the allowed values
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
