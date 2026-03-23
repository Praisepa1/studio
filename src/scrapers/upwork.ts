/**
 * Upwork Scraper (TypeScript + Playwright)
 *
 * Purpose:
 * - Scrape Upwork job search results
 * - Normalize results into your internal Gig shape
 * - Filter jobs posted within the last 0–5 hours
 *
 * Notes:
 * - Upwork may block direct scraping depending on IP/session/fingerprint.
 * - Playwright is used instead of requests/BeautifulSoup because this is TypeScript.
 * - For production, use residential proxies and, if needed, a logged-in session.
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { DEMO_GIGS } from '@/lib/mock-data';
import type { Gig, GigBudget } from '@/types';

export interface UpworkSearchParams {
  query: string;
  experienceLevel?: 'entry' | 'intermediate' | 'expert';
  projectType?: 'short' | 'long' | 'ongoing';
  budgetMin?: number;
  budgetMax?: number;
  limit?: number;
  maxAgeHours?: number; // default: 5
}

export interface ScraperResult {
  gigs: Gig[];
  source: 'mock' | 'live';
  query: string;
  scrapedAt: string;
  itemsFound: number;
  errors?: string[];
}

interface RawUpworkGig {
  title?: string;
  description?: string;
  budgetText?: string;
  skills?: string[];
  url?: string;
  postedText?: string;
  clientLocation?: string;
}

const DEFAULT_TIMEOUT = 45_000;
const DEFAULT_MAX_AGE_HOURS = 5;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeWhitespace(value?: string | null): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function absoluteUpworkUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `https://www.upwork.com${url}`;
  return `https://www.upwork.com/${url}`;
}

function parseMoney(value: string): number | undefined {
  const cleaned = value.replace(/,/g, '');
  const match = cleaned.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : undefined;
}

function parseUpworkBudget(raw: string): GigBudget {
  const text = normalizeWhitespace(raw);

  if (!text) {
    return { type: 'fixed' };
  }

  const lower = text.toLowerCase();

  // Hourly examples:
  // "$15.00-$35.00/hr"
  // "$20 - $40 hourly"
  if (lower.includes('/hr') || lower.includes('hourly') || lower.includes('hour')) {
    const range = text.match(/\$?\s*([\d,.]+)\s*[-–]\s*\$?\s*([\d,.]+)/);
    if (range) {
      return {
        type: 'hourly',
        min: parseMoney(range[1]),
        max: parseMoney(range[2]),
        currency: 'USD',
      };
    }

    const single = parseMoney(text);
    return {
      type: 'hourly',
      min: single,
      max: single,
      currency: 'USD',
    };
  }

  // Fixed-price examples:
  // "$250"
  // "Fixed-price - Intermediate - Est. Budget: $500"
  const fixed = parseMoney(text);
  if (fixed !== undefined) {
    return {
      type: 'fixed',
      min: fixed,
      currency: 'USD',
    };
  }

  return { type: 'fixed' };
}

function parseRelativePostedTextToIso(postedText?: string): string {
  const text = normalizeWhitespace(postedText).toLowerCase();
  const now = Date.now();

  if (!text) {
    return new Date(now).toISOString();
  }

  // Common Upwork patterns:
  // "Posted 5 minutes ago"
  // "5 minutes ago"
  // "Posted 2 hours ago"
  // "2 hrs ago"
  // "Posted yesterday"
  // "yesterday"
  // "just now"
  if (text.includes('just now')) {
    return new Date(now).toISOString();
  }

  if (text.includes('yesterday')) {
    return new Date(now - 24 * 60 * 60 * 1000).toISOString();
  }

  const minuteMatch = text.match(/(\d+)\s*(minute|min)\w*/);
  if (minuteMatch) {
    const minutes = Number(minuteMatch[1]);
    return new Date(now - minutes * 60 * 1000).toISOString();
  }

  const hourMatch = text.match(/(\d+)\s*(hour|hr)\w*/);
  if (hourMatch) {
    const hours = Number(hourMatch[1]);
    return new Date(now - hours * 60 * 60 * 1000).toISOString();
  }

  const dayMatch = text.match(/(\d+)\s*day\w*/);
  if (dayMatch) {
    const days = Number(dayMatch[1]);
    return new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
  }

  return new Date(now).toISOString();
}

function isWithinLastHours(isoDate: string, hours: number): boolean {
  const posted = new Date(isoDate).getTime();
  if (Number.isNaN(posted)) return false;
  const diffMs = Date.now() - posted;
  return diffMs >= 0 && diffMs <= hours * 60 * 60 * 1000;
}

function matchesBudgetRange(budget: GigBudget, min?: number, max?: number): boolean {
  if (min == null && max == null) return true;

  const candidates = [budget.min, budget.max].filter(
    (v): v is number => typeof v === 'number' && !Number.isNaN(v)
  );

  if (candidates.length === 0) return true;

  const low = Math.min(...candidates);
  const high = Math.max(...candidates);

  if (min != null && high < min) return false;
  if (max != null && low > max) return false;

  return true;
}

function normalizeRawGig(raw: RawUpworkGig, index: number): Gig {
  const postedAt = parseRelativePostedTextToIso(raw.postedText);

  return {
    id: `upwork-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    title: normalizeWhitespace(raw.title) || 'Untitled Gig',
    description: normalizeWhitespace(raw.description),
    budget: parseUpworkBudget(raw.budgetText ?? ''),
    skills: Array.from(new Set((raw.skills ?? []).map((s) => normalizeWhitespace(s)).filter(Boolean))),
    url: absoluteUpworkUrl(raw.url),
    status: 'new',
    source: 'upwork',
    scrapedAt: new Date().toISOString(),
    postedAt,
  };
}

// Optional demo fallback
function runDemoScraper(params: UpworkSearchParams, errors?: string[]): ScraperResult {
  const query = params.query.toLowerCase();
  let filtered = DEMO_GIGS;

  if (query) {
    filtered = DEMO_GIGS.filter(
      (g) =>
        g.title.toLowerCase().includes(query) ||
        g.description.toLowerCase().includes(query) ||
        g.skills.some((s) => s.toLowerCase().includes(query))
    );
  }

  if (filtered.length === 0) filtered = DEMO_GIGS;

  const maxAgeHours = params.maxAgeHours ?? DEFAULT_MAX_AGE_HOURS;
  const limit = params.limit ?? 20;

  const results = filtered
    .slice(0, limit)
    .map((g, index) => ({
      ...g,
      id: `demo-${Date.now()}-${index}`,
      status: 'new' as const,
      source: 'upwork' as const,
      scrapedAt: new Date().toISOString(),
      postedAt: new Date(Date.now() - Math.random() * maxAgeHours * 60 * 60 * 1000).toISOString(),
    }))
    .filter((g) => isWithinLastHours(g.postedAt, maxAgeHours));

  return {
    gigs: results,
    source: 'mock',
    query: params.query,
    scrapedAt: new Date().toISOString(),
    itemsFound: results.length,
    errors,
  };
}

function buildSearchUrl(params: UpworkSearchParams): string {
  const url = new URL('https://www.upwork.com/nx/search/jobs/');

  url.searchParams.set('q', params.query);
  url.searchParams.set('sort', 'recency');

  // Optional heuristics
  if (params.experienceLevel) {
    const map: Record<NonNullable<UpworkSearchParams['experienceLevel']>, string> = {
      entry: 'entry_level',
      intermediate: 'intermediate',
      expert: 'expert',
    };
    url.searchParams.set('experience_level', map[params.experienceLevel]);
  }

  // These may not always be honored by Upwork UI, but harmless if present
  if (params.projectType) {
    const projectMap: Record<NonNullable<UpworkSearchParams['projectType']>, string> = {
      short: 'one_time_project',
      long: 'complex_project',
      ongoing: 'ongoing_project',
    };
    url.searchParams.set('project_type', projectMap[params.projectType]);
  }

  return url.toString();
}

async function createBrowser(): Promise<Browser> {
  return chromium.launch({
    headless: true,
  });
}

async function createContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 2000 },
    locale: 'en-US',
    timezoneId: 'Africa/Lagos',
  });
}

async function extractRawGigsFromPage(page: Page): Promise<RawUpworkGig[]> {
  // Wait for either job cards or a likely fallback page state
  await page.waitForLoadState('domcontentloaded');
  await delay(2500);

  const possibleCards = [
    'section.air3-card',
    '[data-test="JobTile"]',
    'article.job-tile',
    '.job-tile',
  ];

  let foundSelector: string | null = null;
  for (const selector of possibleCards) {
    const count = await page.locator(selector).count();
    if (count > 0) {
      foundSelector = selector;
      break;
    }
  }

  if (!foundSelector) {
    return [];
  }

  const cards = page.locator(foundSelector);
  const cardCount = await cards.count();
  const items: RawUpworkGig[] = [];

  for (let i = 0; i < cardCount; i += 1) {
    const card = cards.nth(i);

    const title = normalizeWhitespace(
      (await card.locator('h3, [data-test="job-title"], a[href*="/jobs/~"]').first().textContent().catch(() => null)) ??
      ''
    );

    const url =
      (await card
        .locator('a[href*="/jobs/~"], a.up-n-link, a[href*="/job-details/"]')
        .first()
        .getAttribute('href')
        .catch(() => null)) ?? '';

    const description = normalizeWhitespace(
      (await card
        .locator(
          '[data-test="job-description-text"], [data-test="UpCLineClamp JobDescription"], .air3-line-clamp, p'
        )
        .first()
        .textContent()
        .catch(() => null)) ?? ''
    );

    const postedText = normalizeWhitespace(
      (await card
        .locator(
          '[data-test="job-pubilshed-date"], [data-test="job-published-date"], small, .text-light-on-muted'
        )
        .first()
        .textContent()
        .catch(() => null)) ?? ''
    );

    const budgetText = normalizeWhitespace(
      (await card
        .locator(
          '[data-test="job-type"], [data-test="is-fixed-price"], [data-test="hourly-rate"], strong, .js-type'
        )
        .first()
        .textContent()
        .catch(() => null)) ?? ''
    );

    const skills = await card
      .locator('[data-test="TokenClamp"] span, .air3-token span, [class*="skill"]')
      .allTextContents()
      .catch(() => []);

    const clientLocation = normalizeWhitespace(
      (await card
        .locator('[data-test="client-country"], [data-test="location"]')
        .first()
        .textContent()
        .catch(() => null)) ?? ''
    );

    if (!title && !description) continue;

    items.push({
      title,
      description,
      budgetText,
      skills,
      url,
      postedText,
      clientLocation,
    });
  }

  return items;
}

async function scrapeSearchPage(page: Page, params: UpworkSearchParams): Promise<RawUpworkGig[]> {
  const url = buildSearchUrl(params);

  await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: DEFAULT_TIMEOUT,
  });

  // Basic anti-bot pacing
  await page.mouse.move(200, 300);
  await delay(1500);

  // Scroll to trigger lazy rendering
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let total = 0;
      const step = 800;
      const timer = setInterval(() => {
        window.scrollBy(0, step);
        total += step;
        if (total >= 3200) {
          clearInterval(timer);
          resolve();
        }
      }, 300);
    });
  });

  await delay(2000);

  return extractRawGigsFromPage(page);
}

async function runLiveScraper(params: UpworkSearchParams): Promise<ScraperResult> {
  const errors: string[] = [];
  const browser = await createBrowser();

  try {
    const context = await createContext(browser);
    const page = await context.newPage();
    const rawGigs = await scrapeSearchPage(page, params);

    if (rawGigs.length === 0) {
      errors.push('No live jobs were extracted. Upwork may have blocked the session or changed selectors.');
      return runDemoScraper(params, errors);
    }

    const maxAgeHours = params.maxAgeHours ?? DEFAULT_MAX_AGE_HOURS;
    const limit = params.limit ?? 20;

    const gigs = rawGigs
      .map((raw, index) => normalizeRawGig(raw, index))
      .filter((gig) => isWithinLastHours(gig.postedAt, maxAgeHours))
      .filter((gig) => matchesBudgetRange(gig.budget, params.budgetMin, params.budgetMax))
      .slice(0, limit);

    return {
      gigs,
      source: 'live',
      query: params.query,
      scrapedAt: new Date().toISOString(),
      itemsFound: gigs.length,
      errors: errors.length ? errors : undefined,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`Live scraping failed: ${message}`);
    return runDemoScraper(params, errors);
  } finally {
    await browser.close().catch(() => undefined);
  }
}

export async function scrapeUpwork(params: UpworkSearchParams): Promise<ScraperResult> {
  const mode = process.env.SCRAPER_MODE ?? 'live';

  if (mode === 'mock') {
    await delay(500);
    return runDemoScraper(params);
  }

  return runLiveScraper(params);
}

export type { Gig };