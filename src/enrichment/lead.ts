// @ts-nocheck
import { researchPrompts } from '../ai/prompts';
import { generateWithProvider } from '../ai/providers';
import type { Lead, AIProvider } from '../types';

export interface EnrichmentOptions {
  provider?: AIProvider;
}

export interface LeadEnrichmentResult {
  summary: string;
  businessNeedSummary: string;
  likelyPainPoints: string[];
  communicationStyle: string;
  recommendedTone: string;
  outreachAngle: string;
  suggestedOfferFraming: string;
  likelyObjections: string[];
  confidenceNotes: string;
  qualityScore: number;
}

export async function enrichLead(
  lead: Lead,
  options: EnrichmentOptions = {}
): Promise<Partial<Lead>> {
  const provider = options.provider ?? 'gemini';

  const prompt = researchPrompts.leadAnalysis({
    name: lead.name,
    company: lead.company ?? 'Unknown',
    role: lead.role ?? 'Unknown',
    bio: lead.bio ?? 'No bio available',
    publicText: lead.businessNeedIndicators?.join('. ') ?? '',
  });

  try {
    const result = await generateWithProvider(provider, prompt, { maxTokens: 1024 });
    const parsed: LeadEnrichmentResult = JSON.parse(result.content);

    return {
      summary: parsed.summary,
      businessNeedSummary: parsed.businessNeedSummary,
      likelyPainPoints: parsed.likelyPainPoints,
      communicationStyle: parsed.communicationStyle,
      recommendedTone: parsed.recommendedTone as Lead['recommendedTone'],
      outreachAngle: parsed.outreachAngle,
      suggestedOfferFraming: parsed.suggestedOfferFraming,
      likelyObjections: parsed.likelyObjections,
      confidenceNotes: parsed.confidenceNotes,
      qualityScore: parsed.qualityScore,
    };
  } catch {
    return {
      summary: 'Enrichment unavailable — check AI provider configuration.',
      qualityScore: 5,
    };
  }
}
