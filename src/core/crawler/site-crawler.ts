import { newContext } from './browser';
import { crawlPage, PageResult, SkipResult } from './page-crawler';
import { has as cacheHas, get as cacheGet, set as cacheSet } from '../cache';

export interface CrawlResult {
  pages: PageResult[];
  meta: {
    pages_crawled: number;
    pages_skipped: number;
    skip_reasons: string[];
    crawl_duration_ms: number;
  };
}

export interface CrawlSiteOptions {
  target_pages?: string[];
  max_pages?: number;
  timeout_ms?: number;
  respectRobots?: boolean;
}

function getApexDomain(urlStr: string): string {
  try {
    const hostname = new URL(urlStr).hostname.toLowerCase();
    const parts = hostname.split('.');
    if (parts.length > 2) {
      const secondToLast = parts[parts.length - 2];
      if (['co', 'com', 'org', 'net', 'gov', 'edu', 'ac'].includes(secondToLast) && parts.length >= 3) {
        return parts.slice(-3).join('.');
      }
      return parts.slice(-2).join('.');
    }
    return hostname;
  } catch {
    return '';
  }
}

function matchesPattern(urlStr: string, patterns: string[]): boolean {
  try {
    const path = new URL(urlStr).pathname.toLowerCase();
    return patterns.some(pattern => {
      if (pattern === 'about') {
        return path.includes('about') || path.includes('info') || path.includes('story') || path.includes('who-we-are');
      }
      if (pattern === 'contact') {
        return path.includes('contact') || path.includes('support') || path.includes('reach-us') || path.includes('get-in-touch');
      }
      if (pattern === 'careers') {
        return path.includes('career') || path.includes('job') || path.includes('join') || path.includes('work-with-us') || path.includes('work-at');
      }
      if (pattern === 'team') {
        return path.includes('team') || path.includes('people') || path.includes('staff') || path.includes('leadership');
      }
      return path.includes(pattern.toLowerCase());
    });
  } catch {
    return false;
  }
}

function extractLinksFromHtml(html: string, baseUrl: string): string[] {
  const links = new Set<string>();
  const hrefRegex = /<a[^>]+href=["']([^"']+)["']/gi;
  let match;
  while ((match = hrefRegex.exec(html)) !== null) {
    try {
      const resolved = new URL(match[1], baseUrl).href;
      links.add(resolved);
    } catch {
      // Ignore invalid URLs
    }
  }
  return Array.from(links);
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function crawlSite(
  start_url: string,
  options: CrawlSiteOptions = {}
): Promise<CrawlResult> {
  const startTime = Date.now();

  const target_pages = options.target_pages || ['about', 'contact', 'careers', 'team'];
  let max_pages = options.max_pages !== undefined ? options.max_pages : 5;
  // Hard cap at 100
  if (max_pages > 10) {
    max_pages = 100;
  }

  const timeout_ms = options.timeout_ms;
  const respectRobots = options.respectRobots;

  const startApexDomain = getApexDomain(start_url);

  const pages: PageResult[] = [];
  const skipReasons: string[] = [];
  let pagesCrawled = 0;
  let pagesSkipped = 0;

  // Track found page types to stop early if all targeted types are found
  const foundTargetTypes = new Set<string>();

  // Browser Context for this crawl job
  let context;
  try {
    context = await newContext();
  } catch (error: any) {
    console.error('Failed to create browser context for crawlSite:', error);
    return {
      pages: [],
      meta: {
        pages_crawled: 0,
        pages_skipped: 1,
        skip_reasons: ['browser_unavailable'],
        crawl_duration_ms: Date.now() - startTime
      }
    };
  }

  try {
    // 1. Crawl the homepage first
    const homepageResult = await crawlPage(start_url, context, { timeoutMs: timeout_ms, respectRobots });

    if (!homepageResult.success) {
      pagesSkipped++;
      skipReasons.push(homepageResult.reason);
      return {
        pages: [],
        meta: {
          pages_crawled: 0,
          pages_skipped: pagesSkipped,
          skip_reasons: skipReasons,
          crawl_duration_ms: Date.now() - startTime
        }
      };
    }

    pages.push(homepageResult);
    cacheSet(start_url, homepageResult);
    pagesCrawled++;

    if (homepageResult.page_type && target_pages.includes(homepageResult.page_type)) {
      foundTargetTypes.add(homepageResult.page_type);
    }

    // If we only wanted 1 page, or already hit our targets
    if (pagesCrawled >= max_pages || foundTargetTypes.size === target_pages.length) {
      return {
        pages,
        meta: {
          pages_crawled: pagesCrawled,
          pages_skipped: pagesSkipped,
          skip_reasons: skipReasons,
          crawl_duration_ms: Date.now() - startTime
        }
      };
    }

    // 2. Discover links from the homepage
    const discoveredLinks = extractLinksFromHtml(homepageResult.html, homepageResult.resolvedUrl);

    // Queue of URLs to visit
    const queue: string[] = [];
    const visitedOrQueued = new Set<string>();
    visitedOrQueued.add(start_url);

    for (const link of discoveredLinks) {
      const linkApex = getApexDomain(link);

      // Filter: same apex domain, not already visited/queued, matches at least one target pattern
      if (linkApex === startApexDomain && !visitedOrQueued.has(link)) {
        // Also check if already cached
        if (cacheHas(link)) {
          const cachedResult = cacheGet(link);
          if (cachedResult && cachedResult.success) {
            // Already cached successful result, can reuse or skip crawling
            pages.push(cachedResult);
            pagesCrawled++;
            visitedOrQueued.add(link);
            if (cachedResult.page_type && target_pages.includes(cachedResult.page_type)) {
              foundTargetTypes.add(cachedResult.page_type);
            }
            if (pagesCrawled >= max_pages || foundTargetTypes.size === target_pages.length) {
              break;
            }
            continue;
          }
        }

        if (matchesPattern(link, target_pages)) {
          queue.push(link);
          visitedOrQueued.add(link);
        }
      }
    }

    // 3. BFS crawl queue
    while (queue.length > 0 && pagesCrawled < max_pages && foundTargetTypes.size < target_pages.length) {
      const nextUrl = queue.shift()!;

      // Respect rate limit: min 1000ms delay between page loads on the same domain
      await delay(1000);

      const pageResult = await crawlPage(nextUrl, context, { timeoutMs: timeout_ms, respectRobots });

      if (pageResult.success) {
        pages.push(pageResult);
        cacheSet(nextUrl, pageResult);
        pagesCrawled++;

        if (pageResult.page_type && target_pages.includes(pageResult.page_type)) {
          foundTargetTypes.add(pageResult.page_type);
        }
      } else {
        pagesSkipped++;
        skipReasons.push(pageResult.reason);
      }
    }

  } finally {
    try {
      await context.close();
    } catch (e) {
      console.error('Error closing context in site-crawler:', e);
    }
  }

  return {
    pages,
    meta: {
      pages_crawled: pagesCrawled,
      pages_skipped: pagesSkipped,
      skip_reasons: skipReasons,
      crawl_duration_ms: Date.now() - startTime
    }
  };
}
