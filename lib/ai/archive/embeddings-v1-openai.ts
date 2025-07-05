// OpenAI embeddings for semantic similarity calculation

export async function getOpenAIEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small', // Cost-effective embedding model
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
    // Get embeddings for all texts
    const embeddings = await Promise.all(
      texts.map(text => getOpenAIEmbedding(text))
    );

    // Calculate pairwise cosine similarities
    const similarities: number[] = [];
    
    for (let i = 0; i < embeddings.length; i++) {
      for (let j = i + 1; j < embeddings.length; j++) {
        const similarity = cosineSimilarity(embeddings[i], embeddings[j]);
        similarities.push(similarity);
      }
    }

    // Return average similarity
    return similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
  } catch (error) {
    console.error('Error calculating semantic similarity:', error);
    // Fallback to 0.5 if embedding fails
    return 0.5;
  }
}

export function calculateJaccardSimilarity(texts: string[]): number {
  // Convert texts to word sets
  const wordSets = texts.map(text => 
    new Set(
      text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2) // Filter out very short words
    )
  );

  // Find intersection (words in ALL sets)
  const intersection = new Set(
    [...wordSets[0]].filter(word => 
      wordSets.every(set => set.has(word))
    )
  );

  // Find union (all unique words)
  const union = new Set(
    wordSets.flatMap(set => [...set])
  );

  // Return Jaccard index
  return union.size > 0 ? intersection.size / union.size : 0;
}
