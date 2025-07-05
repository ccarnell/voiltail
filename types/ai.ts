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
  agreementLevel: number; // 0-100
  alignedPoints: AlignedPoint[];
  divergentSections: DivergentSection[];
  confidence: number;
  originalResponses: ModelResponse[];
}

export interface AlignmentData {
  gemini: number;
  chatgpt: number;
  claude: number;
  overallAlignment: 'high' | 'moderate' | 'low';
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
