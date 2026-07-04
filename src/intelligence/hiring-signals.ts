import type { PageResult } from '@/core/crawler/page-crawler';
import type { JobListingsResult as JobListingResult } from '@/core/extractor/jobs';

export interface HiringSignalResult {
  careers_page_exists: boolean;
  active_listings: number;
  most_recent_posting: string | null;
  departments_hiring: string[];
  hiring_language_present: boolean;
  signal_strength: 'strong' | 'moderate' | 'weak' | 'none';
}

export function detectHiringSignals(input: {
  pages: PageResult[];
  job_listings?: JobListingResult;
}): HiringSignalResult {
  const { pages, job_listings } = input;

  // 1. Check careers page existence
  const careers_page_exists = pages.some(p => p.page_type === 'careers');

  // 2. Process active job listings
  let active_listings = 0;
  let most_recent_posting: string | null = null;
  let departments_hiring: string[] = [];

  if (job_listings && job_listings.listings && job_listings.listings.length > 0) {
    active_listings = job_listings.listings.length;
    most_recent_posting = job_listings.meta.recency_summary || null;
    
    const depts = new Set<string>();
    for (const listing of job_listings.listings) {
      if (listing.department) {
        depts.add(listing.department.trim());
      }
    }
    departments_hiring = Array.from(depts);
  }

  // 3. Scan for hiring language (only set to true if no structured listings are extracted)
  const hiringPhrases = ["we're hiring", "join our team", "open positions", "now hiring", "we are hiring", "careers at"];
  let hiring_language_present = false;

  const foundHiringText = pages.some(p => {
    const text = (p.text_content || '').toLowerCase();
    return hiringPhrases.some(phrase => text.includes(phrase));
  });

  if (foundHiringText && active_listings === 0) {
    hiring_language_present = true;
  }

  // 4. Signal strength determination
  // strong: careers page + active listings
  // moderate: careers page OR listings but not both
  // weak: hiring language only, no structured listings
  // none: no indicators
  let signal_strength: HiringSignalResult['signal_strength'] = 'none';

  if (careers_page_exists && active_listings > 0) {
    signal_strength = 'strong';
  } else if (careers_page_exists || active_listings > 0) {
    signal_strength = 'moderate';
  } else if (hiring_language_present || foundHiringText) {
    signal_strength = 'weak';
  }

  return {
    careers_page_exists,
    active_listings,
    most_recent_posting,
    departments_hiring,
    hiring_language_present,
    signal_strength,
  };
}
