import type { AIProviderAdapter, GenerationOptions } from './types';
import { openrouterClaudeProvider } from './openrouter';

// Lazy-load Anthropic so the build doesn't fail if the key is absent
/*
function getAnthropicClient() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Anthropic = require('@anthropic-ai/sdk');
  return new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
}
*/

export const claudeProvider: AIProviderAdapter = {
  name: 'claude',
  model: 'anthropic/claude-3.5-sonnet',

  async generate(prompt: string, options?: GenerationOptions): Promise<string> {
    /*
    if (!process.env.ANTHROPIC_API_KEY) {
      if (process.env.OPENROUTER_API_KEY) {
        console.warn('ANTHROPIC_API_KEY is not configured. Falling back to OpenRouter...');
        return openrouterClaudeProvider.generate(prompt, options);
      }
      throw new Error('ANTHROPIC_API_KEY is not configured. Add it to your .env file.');
    }

    try {
      const client = getAnthropicClient();
      const response = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: options?.maxTokens ?? 2048,
        ...(options?.systemPrompt ? { system: options.systemPrompt } : {}),
        messages: [{ role: 'user', content: prompt }],
      });

      const block = response.content[0];
      if (block.type !== 'text') throw new Error('Unexpected response type from Claude');
      return block.text;
    } catch (error) {
      if (process.env.OPENROUTER_API_KEY) {
        console.warn('Direct Claude call failed. Falling back to OpenRouter...', error);
        return openrouterClaudeProvider.generate(prompt, options);
      }
      throw error;
    }
    */

    return openrouterClaudeProvider.generate(prompt, options);
  },
};
