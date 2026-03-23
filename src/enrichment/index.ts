/**
 * AI Enrichment Pipeline
 *
 * Stages:
 *   1. Extract   — pull structured fields from raw text (done in scrapers)
 *   2. Enrich    — use AI to infer meaning, tone, pain points, strategy
 *   3. Score     — assign quality/conversion scores (see scoring/)
 *
 * Uses the AI provider layer — defaults to Gemini, supports Claude.
 */

import { researchPrompts } from '@/ai/prompts';
import { generateWithProvider } from '@/ai/providers';
import type { Gig, Lead, AIProvider } from '@/types';

export interface EnrichmentOptions {
  provider?: AIProvider;
}

// ─── Gig Enrichment ──────────────────────────────────────────

interface GigEnrichmentResult {
  summary: string;
  likelyPainPoints: string[];
  likelyClientTone: string;
  proposalAngles: string[];
  likelyObjections: string[];
  bestMessageAngle: string;
  recommendedStyle: string;
  conversionScore: number;
  clientProfileSummary: string;
}

export async function enrichGig(
  gig: Gig,
  options: EnrichmentOptions = {}
): Promise<Partial<Gig>> {
  const provider = options.provider ?? 'gemini';

  const budgetStr =
    gig.budget.type === 'hourly'
      ? `$${gig.budget.min ?? '?'}–$${gig.budget.max ?? '?'}/hr`
      : `$${gig.budget.min ?? '?'}–$${gig.budget.max ?? '?'} fixed`;

  const clientHistoryStr = gig.clientHistory
    ? `$${gig.clientHistory.totalSpent ?? 0} spent, ${gig.clientHistory.hires ?? 0} hires, ${gig.clientHistory.rating ?? 0}★`
    : 'No history';

  const prompt = researchPrompts.gigAnalysis({
    title: gig.title,
    description: gig.description,
    skills: gig.skills,
    budget: budgetStr,
    clientHistory: clientHistoryStr,
  });

  try {
    const result = await generateWithProvider(provider, prompt, { maxTokens: 1024 });
    const parsed: GigEnrichmentResult = JSON.parse(result.content);

    return {
      summary: parsed.summary,
      likelyPainPoints: parsed.likelyPainPoints,
      likelyClientTone: parsed.likelyClientTone,
      proposalAngles: parsed.proposalAngles,
      likelyObjections: parsed.likelyObjections,
      bestMessageAngle: parsed.bestMessageAngle,
      recommendedStyle: parsed.recommendedStyle as Gig['recommendedStyle'],
      conversionScore: parsed.conversionScore,
      clientProfileSummary: parsed.clientProfileSummary,
    };
  } catch {
    return {
      summary: 'Enrichment unavailable — check AI provider configuration.',
      conversionScore: 5,
    };
  }
}

// ─── Lead Enrichment ─────────────────────────────────────────

interface LeadEnrichmentResult {
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
