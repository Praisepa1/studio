import { expect, test, describe } from 'vitest';
import { crawlSite } from '../site-crawler';
import { cleanup } from '../browser';

describe('Site Crawler Verification', () => {
  test('crawls example.com successfully and returns results', async () => {
    // Increase timeout since browser launch and network crawling can take time
    const result = await crawlSite('https://example.com', {
      max_pages: 1,
      respectRobots: false, // example.com doesn't usually disallow, but let's be safe
    });

    expect(result).toBeDefined();
    expect(result.pages).toBeInstanceOf(Array);
    expect(result.pages.length).toBeGreaterThanOrEqual(1);

    const homepage = result.pages[0];
    expect(homepage.success).toBe(true);
    expect(homepage.url).toContain('example.com');
    expect(homepage.html).toBeDefined();
    expect(homepage.html.length).toBeGreaterThan(0);
    expect(homepage.text_content).toBeDefined();
    expect(homepage.text_content.trim().length).toBeGreaterThan(0);
    expect(homepage.page_type).toBe('homepage');
  }, 20000); // 20s timeout
});
