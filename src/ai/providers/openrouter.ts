import type { AIProviderAdapter, GenerationOptions } from './types';

export const createOpenRouterAdapter = (modelName: string): AIProviderAdapter => {
  return {
    name: 'openrouter',
    model: modelName,

    async generate(prompt: string, options?: GenerationOptions): Promise<string> {
      if (!process.env.OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY is not configured. Add it to your .env file.');
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/Praisepa1/studio',
          'X-Title': 'Praisepa1 Studio',
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            ...(options?.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
            { role: 'user', content: prompt },
          ],
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 2048,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      if (!choice || !choice.message) {
        throw new Error(`Invalid response from OpenRouter: ${JSON.stringify(data)}`);
      }

      console.log(`[TOKEN USAGE] Model: ${modelName} | Prompt: ${data.usage?.prompt_tokens} | Completion: ${data.usage?.completion_tokens} | Total: ${data.usage?.total_tokens}`);

      return choice.message.content || '';
    },
  };
};

// Paid via OpenRouter ($0.0000003/prompt)
export const openrouterGeminiProvider = createOpenRouterAdapter('google/gemini-2.5-flash');

// Paid via OpenRouter ($0.000002/prompt) - Pinned from ~anthropic/claude-sonnet-latest for stability
export const openrouterClaudeProvider = createOpenRouterAdapter('anthropic/claude-sonnet-5');

// Free via OpenRouter ($0.00) - Fallback/Bulk generation model
export const openrouterFreeProvider = createOpenRouterAdapter('openai/gpt-oss-20b:free');
