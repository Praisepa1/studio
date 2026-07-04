import { BrowserContext } from 'playwright';

export interface PageResult {
  success: true;
  url: string;
  resolvedUrl: string;
  status: number;
  title: string;
  html: string;
  text_content: string;
  load_time_ms: number;
  page_type: 'homepage' | 'about' | 'contact' | 'careers' | 'team' | 'other';
}

export interface SkipResult {
  success: false;
  url: string;
  reason: 'robots_disallowed' | 'not_found' | 'blocked' | 'timeout' | 'error';
  error_message?: string;
}

export interface CrawlPageOptions {
  respectRobots?: boolean;
  timeoutMs?: number;
}

// Simple Robots.txt Caching
interface RobotsRule {
  userAgent: string;
  disallow: string[];
  allow: string[];
}

const robotsCache = new Map<string, { rules: RobotsRule[]; fetchedAt: number }>();

function getDomain(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    return `${url.protocol}//${url.hostname}`;
  } catch {
    return '';
  }
}

async function getRobotsRules(domain: string): Promise<RobotsRule[]> {
  if (robotsCache.has(domain)) {
    return robotsCache.get(domain)!.rules;
  }

  const rules: RobotsRule[] = [];
  try {
    const res = await fetch(`${domain}/robots.txt`);
    if (res.status === 200) {
      const text = await res.text();
      let currentAgent = '';
      let currentDisallows: string[] = [];
      let currentAllows: string[] = [];

      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        const cleaned = line.split('#')[0].trim();
        if (!cleaned) continue;

        const colonIdx = cleaned.indexOf(':');
        if (colonIdx === -1) continue;

        const key = cleaned.substring(0, colonIdx).trim().toLowerCase();
        const value = cleaned.substring(colonIdx + 1).trim();

        if (key === 'user-agent') {
          if (currentAgent) {
            rules.push({ userAgent: currentAgent, disallow: currentDisallows, allow: currentAllows });
            currentDisallows = [];
            currentAllows = [];
          }
          currentAgent = value.toLowerCase();
        } else if (key === 'disallow') {
          currentDisallows.push(value);
        } else if (key === 'allow') {
          currentAllows.push(value);
        }
      }
      if (currentAgent) {
        rules.push({ userAgent: currentAgent, disallow: currentDisallows, allow: currentAllows });
      }
    }
  } catch (err) {
    console.warn(`Could not fetch robots.txt for ${domain}:`, err);
  }

  robotsCache.set(domain, { rules, fetchedAt: Date.now() });
  return rules;
}

export function isPathAllowed(rules: RobotsRule[], path: string, userAgent = '*'): boolean {
  const uaLower = userAgent.toLowerCase();
  let activeRule = rules.find(r => r.userAgent === uaLower);
  if (!activeRule && uaLower !== '*') {
    activeRule = rules.find(r => r.userAgent === '*');
  }

  if (!activeRule) {
    return true;
  }

  const normPath = path || '/';

  const matches = (pattern: string) => {
    if (!pattern) return false;
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*');
    const regex = new RegExp('^' + escaped);
    return regex.test(normPath);
  };

  const allRules = [
    ...activeRule.allow.map(p => ({ type: 'allow', pattern: p })),
    ...activeRule.disallow.map(p => ({ type: 'disallow', pattern: p }))
  ].sort((a, b) => b.pattern.length - a.pattern.length);

  for (const rule of allRules) {
    if (matches(rule.pattern)) {
      return rule.type === 'allow';
    }
  }

  return true;
}

export function classifyPageType(urlStr: string): 'homepage' | 'about' | 'contact' | 'careers' | 'team' | 'other' {
  try {
    const url = new URL(urlStr);
    const path = url.pathname.toLowerCase().replace(/\/$/, '');
    if (path === '' || path === '/' || path === '/index.html' || path === '/index.htm') {
      return 'homepage';
    }
    if (path.includes('about') || path.includes('info') || path.includes('story') || path.includes('who-we-are')) {
      return 'about';
    }
    if (path.includes('contact') || path.includes('support') || path.includes('reach-us') || path.includes('get-in-touch')) {
      return 'contact';
    }
    if (path.includes('career') || path.includes('job') || path.includes('join') || path.includes('work-with-us') || path.includes('work-at')) {
      return 'careers';
    }
    if (path.includes('team') || path.includes('people') || path.includes('staff') || path.includes('leadership')) {
      return 'team';
    }
    return 'other';
  } catch {
    return 'other';
  }
}

export async function crawlPage(
  url: string,
  context: BrowserContext,
  options: CrawlPageOptions = {}
): Promise<PageResult | SkipResult> {
  const respectRobots = options.respectRobots !== undefined ? options.respectRobots : (process.env.RESPECT_ROBOTS !== 'false');
  const envTimeout = process.env.CRAWLER_TIMEOUT_MS ? parseInt(process.env.CRAWLER_TIMEOUT_MS, 10) : 10000;
  const timeout = options.timeoutMs !== undefined ? options.timeoutMs : envTimeout;

  // 1. Robots.txt check
  if (respectRobots) {
    const domain = getDomain(url);
    if (domain) {
      const rules = await getRobotsRules(domain);
      try {
        const parsedUrl = new URL(url);
        if (!isPathAllowed(rules, parsedUrl.pathname)) {
          return { success: false, url, reason: 'robots_disallowed' };
        }
      } catch {
        // Skip check if URL parse fails here
      }
    }
  }

  let page;
  const startTime = Date.now();
  try {
    page = await context.newPage();
    
    // Set navigation timeout
    page.setDefaultNavigationTimeout(timeout);

    // 2. Navigate with waitUntil: "domcontentloaded"
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout,
    });

    if (!response) {
      return { success: false, url, reason: 'error', error_message: 'No response received' };
    }

    const status = response.status();
    if (status === 404) {
      return { success: false, url, reason: 'not_found' };
    }
    if (status === 403 || status === 429) {
      return { success: false, url, reason: 'blocked' };
    }

    // 3. Wait for networkidle OR 1500ms fixed fallback
    await Promise.race([
      page.waitForLoadState('networkidle').catch(() => {}),
      new Promise(resolve => setTimeout(resolve, 1500))
    ]);

    const load_time_ms = Date.now() - startTime;
    const resolvedUrl = page.url();
    const title = await page.title();
    const html = await page.content();

    // 4. Capture visible text_content, stripping script/style/noscript
    const text_content = await page.evaluate(() => {
      const body = document.body;
      if (!body) return '';
      const temp = body.cloneNode(true) as HTMLElement;
      const tags = temp.querySelectorAll('script, style, noscript');
      tags.forEach(t => t.remove());
      return temp.innerText || temp.textContent || '';
    });

    // 5. Classify page_type
    const page_type = classifyPageType(resolvedUrl);

    return {
      success: true,
      url,
      resolvedUrl,
      status,
      title,
      html,
      text_content,
      load_time_ms,
      page_type
    };

  } catch (error: any) {
    const load_time_ms = Date.now() - startTime;
    const isTimeout = error.name === 'TimeoutError' || error.message?.includes('timeout') || load_time_ms >= timeout;
    if (isTimeout) {
      return { success: false, url, reason: 'timeout' };
    }
    return { success: false, url, reason: 'error', error_message: error.message };
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (e) {
        console.error('Error closing page:', e);
      }
    }
  }
}
