import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import type { FileAttachment } from '@/types/ai';

export async function POST(request: Request) {
  try {
    const { prompt, attachments } = await request.json();
    
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google API key not configured' },
        { status: 500 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Handle attachments if present
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: prompt }];
    
    if (attachments && attachments.length > 0) {
      attachments.forEach((attachment: FileAttachment) => {
        parts.push({
          inlineData: {
            mimeType: attachment.mimeType,
            data: attachment.base64
          }
        });
      });
    }

    const result = await model.generateContent(parts);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ response: text });
  } catch (error) {
    console.error('Gemini API error:', error);
    return NextResponse.json(
      { error: 'Failed to get response from Gemini' },
      { status: 500 }
    );
  }
}
