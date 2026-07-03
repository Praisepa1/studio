// @ts-nocheck
/**
 * Scoring Module
 *
 * Assigns quality/conversion scores to gigs and leads.
 * Uses heuristic rules first (fast, deterministic, no API cost).
 * AI enrichment can override or augment these scores.
 */

import type {  Lead  } from '@/types';


// ─── Gig Scoring ─────────────────────────────────────────────

interface GigScoreFactors {
  budgetScore: number;       // 0–30
  clientHistoryScore: number; // 0–30
  descriptionScore: number;  // 0–20
  skillsMatchScore: number;  // 0–20
}

export function scoreGig(gig: Gig, userSkills: string[] = []): number {
  const factors: GigScoreFactors = {
    budgetScore: 0,
    clientHistoryScore: 0,
    descriptionScore: 0,
    skillsMatchScore: 0,
  };

  // Budget score (0–30)
  const budget = gig.budget;
  const midBudget =
    budget.type === 'fixed'
      ? ((budget.min ?? 0) + (budget.max ?? 0)) / 2
      : ((budget.min ?? 0) + (budget.max ?? 0)) / 2;

  if (budget.type === 'hourly') {
    if (midBudget >= 100) factors.budgetScore = 30;
    else if (midBudget >= 60) factors.budgetScore = 22;
    else if (midBudget >= 40) factors.budgetScore = 15;
    else factors.budgetScore = 8;
  } else {
    if (midBudget >= 5000) factors.budgetScore = 30;
    else if (midBudget >= 2000) factors.budgetScore = 24;
    else if (midBudget >= 500) factors.budgetScore = 16;
    else factors.budgetScore = 8;
  }

  // Client history score (0–30)
  const ch = gig.clientHistory;
  if (ch) {
    if ((ch.totalSpent ?? 0) >= 10000) factors.clientHistoryScore += 10;
    else if ((ch.totalSpent ?? 0) >= 1000) factors.clientHistoryScore += 6;

    if ((ch.rating ?? 0) >= 4.8) factors.clientHistoryScore += 10;
    else if ((ch.rating ?? 0) >= 4.5) factors.clientHistoryScore += 7;
    else if ((ch.rating ?? 0) > 0) factors.clientHistoryScore += 4;

    if ((ch.hires ?? 0) >= 5) factors.clientHistoryScore += 10;
    else if ((ch.hires ?? 0) >= 1) factors.clientHistoryScore += 6;
  }

  // Description quality score (0–20)
  const descLen = gig.description.length;
  if (descLen >= 500) factors.descriptionScore = 20;
  else if (descLen >= 300) factors.descriptionScore = 15;
  else if (descLen >= 150) factors.descriptionScore = 10;
  else factors.descriptionScore = 5;

  // Skills match score (0–20)
  if (userSkills.length > 0) {
    const matched = gig.skills.filter((s) =>
      userSkills.some((u) => u.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(u.toLowerCase()))
    );
    factors.skillsMatchScore = Math.min(20, Math.round((matched.length / gig.skills.length) * 20));
  } else {
    factors.skillsMatchScore = 10; // Neutral when no user skills provided
  }

  const total =
    factors.budgetScore +
    factors.clientHistoryScore +
    factors.descriptionScore +
    factors.skillsMatchScore;

  return Math.min(10, Math.round(total / 10));
}

// ─── Lead Scoring ────────────────────────────────────────────

export function scoreLead(lead: Lead): number {
  let score = 0;

  // Profile richness (0–40)
  if (lead.name) score += 5;
  if (lead.company) score += 5;
  if (lead.role) score += 5;
  if (lead.bio && lead.bio.length > 50) score += 10;
  if (lead.website) score += 5;
  if (lead.socialLinks && lead.socialLinks.length > 0) score += 5;
  if (lead.location) score += 5;

  // Business need indicators (0–30)
  const indicators = lead.businessNeedIndicators ?? [];
  score += Math.min(30, indicators.length * 10);

  // Source quality (0–30)
  switch (lead.source) {
    case 'linkedin': score += 30; break;
    case 'facebook': score += 20; break;
    case 'twitter': score += 15; break;
    case 'manual': score += 25; break;
    default: score += 10;
  }

  return Math.min(10, Math.round(score / 10));
}

// ─── Batch Scoring ───────────────────────────────────────────

export function rankGigs(gigs: Gig[], userSkills: string[] = []): Gig[] {
  return [...gigs]
    .map((g) => ({ ...g, conversionScore: g.conversionScore ?? scoreGig(g, userSkills) }))
    .sort((a, b) => (b.conversionScore ?? 0) - (a.conversionScore ?? 0));
}

export function rankLeads(leads: Lead[]): Lead[] {
  return [...leads]
    .map((l) => ({ ...l, qualityScore: l.qualityScore ?? scoreLead(l) }))
    .sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0));
}
