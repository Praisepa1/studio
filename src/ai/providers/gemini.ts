// import { ai } from '@/ai/genkit';
import type { AIProviderAdapter, GenerationOptions } from './types';
import { openrouterGeminiProvider } from './openrouter';

export const geminiProvider: AIProviderAdapter = {
  name: 'gemini',
  model: 'google/gemini-2.5-flash',

  async generate(prompt: string, options?: GenerationOptions): Promise<string> {
    /*
    const fullPrompt = options?.systemPrompt
      ? `${options.systemPrompt}\n\n${prompt}`
      : prompt;

    try {
      const response = await ai.generate({
        prompt: fullPrompt,
        config: {
          maxOutputTokens: options?.maxTokens ?? 2048,
          temperature: options?.temperature ?? 0.7,
        },
      });

      return response.text;
    } catch (error) {
      if (process.env.OPENROUTER_API_KEY) {
        console.warn('Direct Gemini call failed. Falling back to OpenRouter...', error);
        return openrouterGeminiProvider.generate(prompt, options);
      }
      throw error;
    }
    */

    return openrouterGeminiProvider.generate(prompt, options);
  },
};
