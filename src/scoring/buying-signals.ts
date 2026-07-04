import type { TechStackResult } from '@/core/extractor/technology';
import type { JobListingsResult as JobListingResult } from '@/core/extractor/jobs';
import type { ContactsResult as ContactResult } from '@/core/extractor/contacts';

export interface Signal {
  type: string;
  present: boolean;
  description: string;
  weight: number;
  evidence: string;
}

export interface BuyingSignalResult {
  signals: Signal[];
  signal_summary: string;
}

export interface NewsSignal {
  recent: boolean;
  headline?: string;
}

export function detectBuyingSignals(input: {
  url: string;
  html: string;
  headers: Record<string, string>;
  load_time_ms: number;
  tech_stack?: TechStackResult;
  job_listings?: JobListingResult;
  contacts?: ContactResult;
  news?: NewsSignal | null;
  links_checked?: Array<{ url: string; status: number }>;
}): BuyingSignalResult {
  const { url, html, load_time_ms, tech_stack, job_listings, contacts, news, links_checked } = input;
  const signals: Signal[] = [];

  // ─── NEGATIVE SIGNALS ────────────────────────────────────────

  // 1. no_ssl (-8)
  if (url.startsWith('http://')) {
    signals.push({
      type: 'no_ssl',
      present: true,
      description: 'Site served over HTTP with no HTTPS redirect.',
      weight: -8,
      evidence: `URL starts with http://: ${url}`,
    });
  }

  // 2. no_mobile_viewport (-6)
  const hasViewport = html.includes('name="viewport"') || html.includes('name=\'viewport\'');
  const hasFixedWidth = /width:\s*[8-9]\d{2}px|width:\s*\d{4,}px/.test(html) || 
                        /class="[^"]*\b(w-[8-9]\d{2}|w-\d{4,})\b/.test(html);
  if (!hasViewport || hasFixedWidth) {
    signals.push({
      type: 'no_mobile_viewport',
      present: true,
      description: 'No mobile viewport tag or fixed-pixel container found.',
      weight: -6,
      evidence: !hasViewport ? 'Missing <meta name="viewport">' : 'Fixed-width container pattern detected in HTML',
    });
  }

  // 3. stale_copyright (-4)
  const currentYear = new Date().getFullYear();
  let staleCopyright = false;
  let copyrightEvidence = '';
  const copyrightRegex = /(?:©|&copy;|copyright)\s*(?:[0-9]{4}\s*-\s*)?([0-9]{4})/i;
  const copyrightMatch = html.match(copyrightRegex);
  if (copyrightMatch) {
    const year = parseInt(copyrightMatch[1], 10);
    if (year > 1900 && year <= currentYear - 2) {
      staleCopyright = true;
      copyrightEvidence = `Copyright year detected: ${year} (Current: ${currentYear})`;
      signals.push({
        type: 'stale_copyright',
        present: true,
        description: `Footer copyright year is 2+ years behind (${year}).`,
        weight: -4,
        evidence: copyrightEvidence,
      });
    }
  }

  // 4. broken_internal_links (-5 per broken link, capped at -15 total)
  const brokenLinks = links_checked ? links_checked.filter(l => l.status === 404 || l.status === 0) : [];
  if (brokenLinks.length > 0) {
    const count = brokenLinks.length;
    const weight = Math.max(-15, count * -5);
    signals.push({
      type: 'broken_internal_links',
      present: true,
      description: `Detected ${count} broken internal link(s) (404/timeouts).`,
      weight,
      evidence: `Broken links: ${brokenLinks.map(l => l.url).join(', ')}`,
    });
  }

  // 5. no_analytics_detected (-3)
  const hasAnalytics = tech_stack?.detected.some(t => t.category === 'analytics') || false;
  if (!hasAnalytics) {
    signals.push({
      type: 'no_analytics_detected',
      present: true,
      description: 'No analytics tracking scripts detected.',
      weight: -3,
      evidence: 'No analytics category match in tech stack',
    });
  }

  // 6. slow_load_time (-3)
  if (load_time_ms > 5000) {
    signals.push({
      type: 'slow_load_time',
      present: true,
      description: 'Page load time exceeds 5 seconds.',
      weight: -3,
      evidence: `Load time: ${load_time_ms}ms`,
    });
  }

  // 7. unmaintained_stack (-6)
  if (tech_stack?.modernization_signal === 'unmaintained') {
    signals.push({
      type: 'unmaintained_stack',
      present: true,
      description: 'Technology stack is flagged as unmaintained.',
      weight: -6,
      evidence: `Tech stack modernization signal: unmaintained (${tech_stack.modernization_reason}). Note: Related to other unmaintained symptoms.`,
    });
  }


  // ─── POSITIVE SIGNALS ────────────────────────────────────────

  // 1. active_hiring (+7)
  const recencySummary = job_listings?.meta?.recency_summary || '';
  const isNoActiveHiring = recencySummary.toLowerCase().includes('no open roles') || recencySummary.toLowerCase().includes('no active');
  if (job_listings && job_listings.listings && job_listings.listings.length > 0 && !isNoActiveHiring) {
    signals.push({
      type: 'active_hiring',
      present: true,
      description: 'Active job postings detected on career page.',
      weight: 7,
      evidence: `Found ${job_listings.listings.length} listing(s) (${recencySummary})`,
    });
  }

  // 2. recent_news_mention (+5)
  if (news) {
    signals.push({
      type: 'recent_news_mention',
      present: true,
      description: 'Recent news mention or press release activity.',
      weight: 5,
      evidence: news.headline ? `Headline: "${news.headline}"` : 'News signals present',
    });
  }

  // 3. modern_stack (+3)
  if (tech_stack?.modernization_signal === 'current') {
    signals.push({
      type: 'modern_stack',
      present: true,
      description: 'Modern development framework and tools detected.',
      weight: 3,
      evidence: `Modernization signal: current (${tech_stack.modernization_reason})`,
    });
  }

  // 4. clear_contact_path (+2)
  const hasNamedContact = contacts && contacts.named_contacts && contacts.named_contacts.length > 0;
  const hasDirectEmail = contacts && contacts.emails && contacts.emails.some(e => {
    const user = e.address.split('@')[0].toLowerCase();
    const genericPrefixes = ['info', 'contact', 'sales', 'support', 'hello', 'admin', 'office', 'jobs', 'careers', 'team'];
    return !genericPrefixes.includes(user);
  });
  if (hasNamedContact || hasDirectEmail) {
    signals.push({
      type: 'clear_contact_path',
      present: true,
      description: 'Direct email or specific named contact path available.',
      weight: 2,
      evidence: hasNamedContact 
        ? `Named contact: ${contacts.named_contacts[0].name} (${contacts.named_contacts[0].role})`
        : `Direct email: ${contacts.emails.find(e => {
            const user = e.address.split('@')[0].toLowerCase();
            return !['info', 'contact', 'sales', 'support', 'hello', 'admin', 'office', 'jobs', 'careers', 'team'].includes(user);
          })?.address}`,
    });
  }

  // 5. ecommerce_active (+2)
  const hasEcommerce = tech_stack?.detected.some(t => t.category === 'ecommerce') || false;
  if (hasEcommerce) {
    signals.push({
      type: 'ecommerce_active',
      present: true,
      description: 'Active e-commerce transactional platform detected.',
      weight: 2,
      evidence: `E-commerce stack: ${tech_stack?.detected.filter(t => t.category === 'ecommerce').map(t => t.technology).join(', ')}`,
    });
  }

  // ─── CLAMPING RULE ───────────────────────────────────────────
  const rawTotal = signals.reduce((sum, s) => sum + s.weight, 0);
  if (rawTotal > 15) {
    signals.push({
      type: 'clamping_adjustment',
      present: true,
      description: 'Capping positive signals to maximum +15 limit',
      weight: 15 - rawTotal,
      evidence: `Raw total was ${rawTotal}`,
    });
  } else if (rawTotal < -15) {
    signals.push({
      type: 'clamping_adjustment',
      present: true,
      description: 'Capping negative signals to minimum -15 limit',
      weight: -15 - rawTotal,
      evidence: `Raw total was ${rawTotal}`,
    });
  }

  // ─── SYNTHESIZE SUMMARY ──────────────────────────────────────
  // Sort by weight magnitude descending, ignore clamping_adjustment for the summary
  const sortedSignificant = signals
    .filter(s => s.type !== 'clamping_adjustment')
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));

  let signal_summary = 'No significant buying signals detected.';
  if (sortedSignificant.length > 0) {
    const topSignals = sortedSignificant.slice(0, 3).map(s => {
      const direction = s.weight > 0 ? 'positive' : 'negative';
      return `${s.type.replace(/_/g, ' ')} (${direction})`;
    });
    signal_summary = `Strongest indicators: ${topSignals.join(', ')}.`;
  }

  return {
    signals,
    signal_summary,
  };
}
