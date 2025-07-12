import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import type { FileAttachment } from '@/types/ai';

export async function POST(request: Request) {
  try {
    const { prompt, attachments } = await request.json();
    
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    // Build content array
    const content: Array<{ type: 'text'; text: string } | { type: 'image'; source: { type: 'base64'; media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'; data: string } }> = [
      { type: 'text', text: prompt }
    ];
    
    // Add images if present
    if (attachments && attachments.length > 0) {
      attachments.forEach((attachment: FileAttachment) => {
        if (attachment.type === 'image') {
          // Ensure media_type is one of the supported types
          const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
          const mediaType = supportedTypes.includes(attachment.mimeType) 
            ? attachment.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
            : 'image/jpeg'; // Default fallback
            
          content.push({
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
      messages: [{
        role: 'user',
        content
      }]
    });

    const text = response.content[0]?.type === 'text' 
      ? response.content[0].text 
      : 'No response';

    return NextResponse.json({ response: text });
  } catch (error) {
    console.error('Claude API error:', error);
    return NextResponse.json(
      { error: 'Failed to get response from Claude' },
      { status: 500 }
    );
  }
}
