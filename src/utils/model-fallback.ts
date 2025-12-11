import { GoogleGenerativeAI } from '@google/generative-ai';

interface ModelInfo {
  name: string;
  version?: string;
  displayName?: string;
}

class ModelFallbackManager {
  private availableModels: Set<string> | null = null;
  private genAI: GoogleGenerativeAI;
  
  // Model fallback priority map
  private readonly fallbackMap: Record<string, string[]> = {
    'gemini-1.5-flash': ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'],
    'gemini-1.5-pro': ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-flash-latest'],
    'gemini-pro': ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-flash-latest'],
  };

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async discoverModels(): Promise<Set<string>> {
    if (this.availableModels) {
      return this.availableModels;
    }

    try {
      const models = await this.genAI.listModels();
      this.availableModels = new Set(
        models.map(model => model.name.replace('models/', ''))
      );
      
      console.log('Available models:', Array.from(this.availableModels).join(', '));
      return this.availableModels;
    } catch (error) {
      console.warn('Failed to discover models:', error);
      this.availableModels = new Set();
      return this.availableModels;
    }
  }

  async resolveModel(requestedModel: string): Promise<string> {
    const cleanModelName = requestedModel.replace('models/', '');
    const availableModels = await this.discoverModels();

    // If requested model is available, use it
    if (availableModels.has(cleanModelName)) {
      return cleanModelName;
    }

    // Try fallbacks
    const fallbacks = this.fallbackMap[cleanModelName] || [];
    for (const fallback of fallbacks) {
      if (availableModels.has(fallback)) {
        console.warn(
          `Model '${cleanModelName}' not available. Using fallback: '${fallback}'`
        );
        return fallback;
      }
    }

    // No fallback found
    throw new Error(
      `Model '${cleanModelName}' not found and no suitable fallback available.\n` +
      `Available models: ${Array.from(availableModels).join(', ')}\n` +
      `Tip: New Google Cloud accounts may only have access to Gemini 2.x models.`
    );
  }

  getGenerativeAI(): GoogleGenerativeAI {
    return this.genAI;
  }
}

export { ModelFallbackManager };
