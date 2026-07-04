import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { ClassificationInput, ClassificationResult } from './types';
import { applyHeuristics } from './rules';

const classificationSchema = z.object({
  category: z.enum(['company', 'job_board', 'ats', 'startup_directory', 'recruitment_agency', 'government', 'education', 'ngo', 'social_profile', 'ignore']),
  confidence: z.enum(['high', 'medium', 'low']),
  reasoning: z.string(),
  recommended_action: z.enum(['crawl', 'skip', 'crawl_with_caution']),
  sub_signal: z.string().nullable().optional(),
});

export async function classifyURL(input: ClassificationInput): Promise<ClassificationResult> {
  // Phase 1: Fast Heuristics
  const heuristicResult = applyHeuristics(input);
  if (heuristicResult) {
    return heuristicResult;
  }

  // Phase 2: AI Fallback
  const prompt = `You are a URL classification engine. You receive a url, optionally a
page title and search snippet, and you must assign exactly one category
from this fixed list: company, job_board, ats, startup_directory,
recruitment_agency, government, education, ngo, social_profile, ignore.

Heuristic rules already ran and could not confidently classify this URL.
Use the title and snippet text to make the best judgment call.

Rules:
- If the snippet describes a specific business selling a product or
  service, classify as company even if the domain looks unusual.
- If you cannot tell what the page is about at all, classify as ignore
  with confidence low rather than guessing at a specific category.
- Never invent information not present in the title/snippet.

Inputs:
URL: ${input.url}
Title: ${input.title || 'N/A'}
Snippet: ${input.snippet || 'N/A'}
Intent: ${input.source_intent || 'N/A'}`;

  try {
    const { output } = await ai.generate({
      prompt,
      output: {
        schema: classificationSchema,
      },
    });

    if (!output) {
      throw new Error('No output from AI classifier');
    }

    return {
      category: output.category as any,
      confidence: output.confidence,
      reasoning: output.reasoning,
      recommended_action: output.recommended_action,
      sub_signal: output.sub_signal,
    };
  } catch (error) {
    console.error('AI classification failed', error);
    // Safe fallback
    return {
      category: 'ignore',
      confidence: 'low',
      reasoning: 'Fallback classification due to AI failure or inconclusive data',
      recommended_action: 'skip',
    };
  }
}
