import { ai } from '@/ai/genkit';
import type { AIProviderAdapter, GenerationOptions } from './types';

export const geminiProvider: AIProviderAdapter = {
  name: 'gemini',
  model: 'googleai/gemini-2.0-flash',

  async generate(prompt: string, options?: GenerationOptions): Promise<string> {
    const fullPrompt = options?.systemPrompt
      ? `${options.systemPrompt}\n\n${prompt}`
      : prompt;

    const response = await ai.generate({
      prompt: fullPrompt,
      config: {
        maxOutputTokens: options?.maxTokens ?? 2048,
        temperature: options?.temperature ?? 0.7,
      },
    });

    return response.text;
  },
};
