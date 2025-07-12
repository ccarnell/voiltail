// Core AI and synthesis types for Voiltail

export interface FileAttachment {
  type: 'image' | 'document';
  mimeType: string;
  base64: string;
  filename: string;
}

export interface ModelResponse {
  model: 'gemini' | 'openai' | 'claude';
  content: string;
  responseTime: number;
}

export interface AIResponse {
  id: string;
  timestamp: string;
  prompt: string;
  attachments?: FileAttachment[];
  responses: {
    claude: string;
    gpt: string;
    gemini: string;
  };
  responseTime: {
    claude: number;
    gpt: number;
    gemini: number;
  };
}

export interface AlignedPoint {
  content: string;
  models: string[];
  strength: number;
}

export interface DivergentSection {
  topic: string;
  content: string;
  models: string[];
  description: string;
}

export interface ConsensusAnalysis {
  unifiedResponse: string;
  alignment: AlignmentData;
  alignedPoints: AlignedPoint[];
  divergentSections: DivergentSection[];
  originalResponses: ModelResponse[];
}

export interface AlignmentData {
  semantic: number; // 0-1 (cosine similarity of embeddings)
  surface: number; // 0-1 (Jaccard similarity)
  gemini: 'high' | 'moderate' | 'low';
  chatgpt: 'high' | 'moderate' | 'low';
  claude: 'high' | 'moderate' | 'low';
  overallAlignment: 'high' | 'moderate' | 'low';
  description: string; // e.g., "Strong semantic alignment with diverse expression"
  methodology: 'semantic-similarity-v2' | 'word-overlap-v1' | 'markdown-ready-v1.0';
  alignedPoints: AlignedPoint[]; // Move aligned points here
}

// Utility function to convert File to base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result as string;
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = error => reject(error);
  });
};
