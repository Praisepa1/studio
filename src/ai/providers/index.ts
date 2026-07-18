import { geminiProvider } from './gemini';
import { claudeProvider } from './claude';
import { openrouterGeminiProvider, openrouterClaudeProvider, openrouterFreeProvider } from './openrouter';
import type { AIProviderAdapter, GenerationOptions } from './types';
import type { AIProvider } from '@/types';

export type { AIProviderAdapter, GenerationOptions };
export { geminiProvider, claudeProvider, openrouterGeminiProvider, openrouterClaudeProvider, openrouterFreeProvider };

export const DEFAULT_AI_PROVIDER: AIProvider = (process.env.NEXT_PUBLIC_DEFAULT_AI_PROVIDER as AIProvider) || 'openrouter-free';

export interface MultiProviderResult {
  content: string;
  model: string;
  geminiDraft?: string;
  claudeRefinement?: string;
}

/**
 * Generate content using the specified provider strategy.
 *
 * - 'gemini'             → single Gemini call
 * - 'claude'             → single Claude call
 * - 'gemini-claude'      → Gemini drafts, Claude refines (pipeline)
 * - 'openrouter-gemini'  → Gemini call via OpenRouter
 * - 'openrouter-claude'  → Claude call via OpenRouter
 * - 'openrouter-pipeline'→ Gemini drafts via OpenRouter, Claude refines via OpenRouter
 */
export async function generateWithProvider(
  provider: AIProvider,
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

  if (provider === 'openrouter-gemini') {
    const content = await openrouterGeminiProvider.generate(prompt, options);
    return { content, model: `OpenRouter: ${openrouterGeminiProvider.model}` };
  }

  if (provider === 'openrouter-claude') {
    const content = await openrouterClaudeProvider.generate(prompt, options);
    return { content, model: `OpenRouter: ${openrouterClaudeProvider.model}` };
  }

  if (provider === 'openrouter-free') {
    const content = await openrouterFreeProvider.generate(prompt, options);
    return { content, model: `OpenRouter: ${openrouterFreeProvider.model}` };
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

  // openrouter-pipeline: Gemini drafts via OpenRouter → Claude refines via OpenRouter
  if (provider === 'openrouter-pipeline') {
    const geminiDraft = await openrouterGeminiProvider.generate(prompt, options);

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

    const claudeRefinement = await openrouterClaudeProvider.generate(refinePrompt, {
      ...options,
      systemPrompt:
        'You are an expert copywriter. Refine AI-generated content to be more persuasive, human, and effective. Return only the refined text.',
    });

    return {
      content: claudeRefinement,
      geminiDraft,
      claudeRefinement,
      model: `OpenRouter: ${openrouterGeminiProvider.model} → ${openrouterClaudeProvider.model}`,
    };
  }

  throw new Error(`Unknown provider: ${provider}`);
}

/** Check which providers are configured */
export function getProviderStatus() {
  return {
    gemini: !!(process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY),
    claude: !!process.env.ANTHROPIC_API_KEY,
    openrouter: !!process.env.OPENROUTER_API_KEY,
  };
}
