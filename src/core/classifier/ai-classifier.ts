import { cleanAndParseJSON } from '../../lib/utils';
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

async function classifyWithOpenRouter(prompt: string): Promise<any> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured.');
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
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `You are a URL classification engine. You must output a JSON object matching this schema exactly:
{
  "category": "company" | "job_board" | "ats" | "startup_directory" | "recruitment_agency" | "government" | "education" | "ngo" | "social_profile" | "ignore",
  "confidence": "high" | "medium" | "low",
  "reasoning": "string",
  "recommended_action": "crawl" | "skip" | "crawl_with_caution",
  "sub_signal": "string"
}

All fields are required. Output ONLY the JSON, no explanations, no markdown formatting.`,
        },
        { role: 'user', content: prompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'url_classification',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              category: {
                type: 'string',
                enum: ['company', 'job_board', 'ats', 'startup_directory', 'recruitment_agency', 'government', 'education', 'ngo', 'social_profile', 'ignore']
              },
              confidence: {
                type: 'string',
                enum: ['high', 'medium', 'low']
              },
              reasoning: {
                type: 'string'
              },
              recommended_action: {
                type: 'string',
                enum: ['crawl', 'skip', 'crawl_with_caution']
              },
              sub_signal: {
                type: 'string'
              }
            },
            required: ['category', 'confidence', 'reasoning', 'recommended_action', 'sub_signal'],
            additionalProperties: false
          }
        }
      },
      temperature: 0.1,
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

  const text = choice.message.content || '';
  return cleanAndParseJSON(text);
}

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

  // Always use OpenRouter
  try {
    const output = await classifyWithOpenRouter(prompt);
    const validated = classificationSchema.parse(output);
    return {
      category: validated.category as any,
      confidence: validated.confidence,
      reasoning: validated.reasoning,
      recommended_action: validated.recommended_action,
      sub_signal: validated.sub_signal,
    };
  } catch (error) {
    console.error('OpenRouter URL classification failed', error);
    
    // Direct Genkit classifier is commented out to only use OpenRouter
    /*
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
    } catch (directError) {
      console.error('Direct AI classification failed', directError);
    }
    */

    // Safe fallback
    return {
      category: 'ignore',
      confidence: 'low',
      reasoning: 'Fallback classification due to AI failure or inconclusive data',
      recommended_action: 'skip',
    };
  }
}
