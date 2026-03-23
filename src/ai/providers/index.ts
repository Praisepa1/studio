import { geminiProvider } from './gemini';
import { claudeProvider } from './claude';
import type { AIProviderAdapter, GenerationOptions } from './types';

export type { AIProviderAdapter, GenerationOptions };
export { geminiProvider, claudeProvider };

export interface MultiProviderResult {
  content: string;
  model: string;
  geminiDraft?: string;
  claudeRefinement?: string;
}

/**
 * Generate content using the specified provider strategy.
 *
 * - 'gemini'       → single Gemini call
 * - 'claude'       → single Claude call
 * - 'gemini-claude'→ Gemini drafts, Claude refines (pipeline)
 */
export async function generateWithProvider(
  provider: 'gemini' | 'claude' | 'gemini-claude',
  prompt: string,
  options?: GenerationOptions
): Promise<MultiProviderResult> {
  if (provider === 'gemini') {
    const content = await geminiProvider.generate(prompt, options);
    return { content, model: geminiProvider.model };
  }

  if (provider === 'claude') {
    const content = await claudeProvider.generate(prompt, options);
    return { content, model: claudeProvider.model };
  }

  // gemini-claude pipeline: Gemini drafts → Claude refines
  if (provider === 'gemini-claude') {
    const geminiDraft = await geminiProvider.generate(prompt, options);

    const refinePrompt = `You are a professional copywriter refining an AI-generated draft.
Your task: improve the draft below to be more persuasive, natural, and polished.
- Strengthen the opening hook
- Improve clarity and flow
- Make it sound genuinely human
- Keep the same intent, length, and structure

Draft to refine:
---
${geminiDraft}
---

Return only the refined version, no preamble.`;

    const claudeRefinement = await claudeProvider.generate(refinePrompt, {
      ...options,
      systemPrompt:
        'You are an expert copywriter. Refine AI-generated content to be more persuasive, human, and effective. Return only the refined text.',
    });

    return {
      content: claudeRefinement,
      geminiDraft,
      claudeRefinement,
      model: `${geminiProvider.model} → ${claudeProvider.model}`,
    };
  }

  throw new Error(`Unknown provider: ${provider}`);
}

/** Check which providers are configured */
export function getProviderStatus() {
  return {
    gemini: !!process.env.GOOGLE_GENAI_API_KEY,
    claude: !!process.env.ANTHROPIC_API_KEY,
  };
}
