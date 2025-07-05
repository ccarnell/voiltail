// GPT-4 powered intelligent synthesis

import type { ModelResponse } from '@/types/ai';

export async function createGPT4Synthesis(
  responses: ModelResponse[],
  alignmentData: { semantic: number; surface: number; overallAlignment: string }
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
        model: 'gpt-4o-mini', // Cost-effective GPT-4 variant
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
        temperature: 0.3 // Lower temperature for more consistent synthesis
      })
    });

    if (!response.ok) {
      throw new Error(`GPT-4 synthesis API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Unable to generate synthesis';
  } catch (error) {
    console.error('Error creating GPT-4 synthesis:', error);
    // Fallback to simple concatenation
    return createFallbackSynthesis(responses);
  }
}

function createSynthesisPrompt(
  responses: ModelResponse[],
  alignmentData: { semantic: number; surface: number; overallAlignment: string }
): string {
  const alignmentContext = getAlignmentContext(alignmentData);
  
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

function getAlignmentContext(alignmentData: { semantic: number; surface: number; overallAlignment: string }): string {
  const semanticLevel = alignmentData.semantic > 0.8 ? 'high' : alignmentData.semantic > 0.6 ? 'moderate' : 'low';
  const surfaceLevel = alignmentData.surface > 0.3 ? 'high' : alignmentData.surface > 0.15 ? 'moderate' : 'low';
  
  if (semanticLevel === 'high' && surfaceLevel === 'high') {
    return 'Models show strong agreement in both meaning and expression';
  } else if (semanticLevel === 'high' && surfaceLevel === 'low') {
    return 'Models agree on core concepts but express them differently';
  } else if (semanticLevel === 'low' && surfaceLevel === 'high') {
    return 'Models use similar language but may have different underlying meanings';
  } else if (semanticLevel === 'moderate') {
    return 'Models show partial agreement with some complementary perspectives';
  } else {
    return 'Models provide diverse perspectives that may complement each other';
  }
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

// Alternative synthesis for when we want more control
export async function createStructuredSynthesis(
  responses: ModelResponse[]
): Promise<string> {
  const prompt = `Analyze these AI responses and create a structured synthesis:

${responses.map((r, i) => `**Model ${i + 1} (${r.model})**:\n${r.content}`).join('\n\n')}

Create a synthesis with these sections:
1. **Consensus Points**: What all models agree on
2. **Key Insights**: Main takeaways from each model
3. **Divergent Views**: Where models disagree or offer different perspectives
4. **Synthesis**: A unified conclusion that incorporates all perspectives

Format as markdown with clear headings.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a research synthesis expert. Create clear, structured analyses.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2500,
        temperature: 0.2
      })
    });

    if (!response.ok) {
      throw new Error(`Structured synthesis API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || createFallbackSynthesis(responses);
  } catch (error) {
    console.error('Error creating structured synthesis:', error);
    return createFallbackSynthesis(responses);
  }
}
