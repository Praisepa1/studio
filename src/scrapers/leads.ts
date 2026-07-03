// @ts-nocheck
/**
 * Lead Scraper
 *
 * Sources: LinkedIn, Facebook, and other public platforms
 *
 * Architecture:
 *   1. Collector  — fetches public profile / search pages
 *   2. Parser     — extracts lead attributes
 *   3. Normalizer — maps to the internal Lead type
 *
 * Production note:
 *   LinkedIn and Facebook have strict anti-scraping policies.
 *   Legal and sustainable approaches:
 *     - LinkedIn Sales Navigator API (partner)
 *     - LinkedIn OIDC / OAuth for profile data
 *     - People Data Labs / Apollo.io / Hunter.io APIs
 *     - Manual import via CSV upload (safest)
 *   This module provides demo mode + real scraper skeleton.
 */

import { DEMO_LEADS } from '@/lib/mock-data';
import type {  Lead, LeadSource  } from '@/types';


export interface LeadSearchParams {
  source: LeadSource;
  query: string;
  niche?: string;
  location?: string;
  limit?: number;
}

export interface LeadScraperResult {
  leads: Lead[];
  source: 'mock' | 'live';
  query: string;
  scrapedAt: string;
  itemsFound: number;
  errors?: string[];
}

// ─── Demo Mode ───────────────────────────────────────────────

function runDemoScraper(params: LeadSearchParams): LeadScraperResult {
  const query = params.query.toLowerCase();
  let filtered = DEMO_LEADS;

  if (query) {
    filtered = DEMO_LEADS.filter(
      (l) =>
        l.name.toLowerCase().includes(query) ||
        l.company?.toLowerCase().includes(query) ||
        l.role?.toLowerCase().includes(query) ||
        l.niche?.toLowerCase().includes(query) ||
        l.bio?.toLowerCase().includes(query)
    );
  }

  if (params.source !== 'other') {
    const sourceFilter = filtered.filter((l) => l.source === params.source);
    if (sourceFilter.length > 0) filtered = sourceFilter;
  }

  if (filtered.length === 0) filtered = DEMO_LEADS;

  const limit = params.limit ?? 20;
  const results = filtered.slice(0, limit).map((l) => ({
    ...l,
    id: `lead-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    status: 'new' as const,
    scrapedAt: new Date().toISOString(),
  }));

  return {
    leads: results,
    source: 'mock',
    query: params.query,
    scrapedAt: new Date().toISOString(),
    itemsFound: results.length,
  };
}

// ─── Real Scraper Skeleton ───────────────────────────────────

async function runLiveScraper(params: LeadSearchParams): Promise<LeadScraperResult> {
  const errors: string[] = [
    `Live scraping for ${params.source} requires API keys or partner access.`,
    'Recommended: Use LinkedIn Sales Navigator API, Apollo.io, or Hunter.io.',
    'Returning demo data.',
  ];

  // Placeholder — add actual API integration here
  // e.g., Apollo.io: await fetch('https://api.apollo.io/v1/people/search', {...})

  return { ...runDemoScraper(params), errors };
}

// ─── Public API ──────────────────────────────────────────────

export async function scrapeLeads(params: LeadSearchParams): Promise<LeadScraperResult> {
  const mode = process.env.SCRAPER_MODE ?? 'mock';

  if (mode === 'real') {
    return runLiveScraper(params);
  }

  await new Promise((r) => setTimeout(r, 600));
  return runDemoScraper(params);
}

export type { Lead };
