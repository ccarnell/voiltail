import { NextRequest, NextResponse } from 'next/server';
import { resultStorage } from '@/lib/result-storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Result ID is required' },
        { status: 400 }
      );
    }

    const result = resultStorage.retrieve(id);
    
    if (!result) {
      return NextResponse.json(
        { error: 'Result not found or expired' },
        { status: 404 }
      );
    }

    // Clean up the result after retrieval (one-time use)
    resultStorage.delete(id);

    return NextResponse.json({
      analysis: result,
      retrieved: true
    });
  } catch (error) {
    console.error('Result retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve result' },
      { status: 500 }
    );
  }
}
