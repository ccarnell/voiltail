import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import type { FileAttachment } from '@/types/ai';

export async function POST(request: Request) {
  try {
    const { prompt, attachments } = await request.json();
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ apiKey });

    // Build messages array
    const userContent: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = [];
    
    // Add text first
    userContent.push({ type: 'text', text: prompt });
    
    // Add images if present
    if (attachments && attachments.length > 0) {
      attachments.forEach((attachment: FileAttachment) => {
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
      messages: [
        {
          role: 'user',
          content: userContent
        }
      ],
      max_tokens: 4000,
    });

    const text = completion.choices[0]?.message?.content || 'No response';

    return NextResponse.json({ response: text });
  } catch (error) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { error: 'Failed to get response from OpenAI' },
      { status: 500 }
    );
  }
}
