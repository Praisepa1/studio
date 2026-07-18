export interface GenerationOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface AIProviderAdapter {
  name: 'gemini' | 'claude' | 'openrouter';
  model: string;
  generate(prompt: string, options?: GenerationOptions): Promise<string>;
}
