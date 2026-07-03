import { SearchProvider } from './types';
import { SearchQuery, SearchResult } from '@/types/search';
import { BraveSearchProvider } from './brave';
import { GoogleSearchProvider } from './google';

export class SearchManager {
  private providers: SearchProvider[];
  private currentProviderIndex = 0;
  // Basic rate limiting: provider name -> next available timestamp
  private rateLimits: Map<string, number> = new Map();
  private readonly rateLimitMs = 1000; // 1 second between requests per provider

  constructor() {
    this.providers = [
      new BraveSearchProvider(),
      new GoogleSearchProvider()
    ];
  }

  private async waitForRateLimit(providerName: string): Promise<void> {
    const nextAvailable = this.rateLimits.get(providerName) || 0;
    const now = Date.now();
    if (now < nextAvailable) {
      await new Promise(resolve => setTimeout(resolve, nextAvailable - now));
    }
    this.rateLimits.set(providerName, Date.now() + this.rateLimitMs);
  }

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      let pathname = parsed.pathname;
      if (pathname.endsWith('/')) {
        pathname = pathname.slice(0, -1);
      }
      return `${parsed.protocol}//${parsed.host.toLowerCase()}${pathname}${parsed.search}`;
    } catch {
      return url;
    }
  }

  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seenUrls = new Set<string>();
    const deduplicated: SearchResult[] = [];

    for (const result of results) {
      const normalized = this.normalizeUrl(result.url);
      if (!seenUrls.has(normalized)) {
        seenUrls.add(normalized);
        deduplicated.push(result);
      }
    }

    return deduplicated;
  }

  async search(query: SearchQuery): Promise<SearchResult[]> {
    const errors: Error[] = [];

    // Try providers in a round-robin fashion
    for (let i = 0; i < this.providers.length; i++) {
      const providerIndex = (this.currentProviderIndex + i) % this.providers.length;
      const provider = this.providers[providerIndex];

      try {
        await this.waitForRateLimit(provider.name);
        const results = await provider.search(query);
        
        // Rotate provider for next call
        this.currentProviderIndex = (providerIndex + 1) % this.providers.length;
        
        return this.deduplicateResults(results);
      } catch (error) {
        errors.push(error as Error);
        console.warn(`Provider ${provider.name} failed:`, error);
        // Continue to next provider
      }
    }

    throw new Error(`All search providers failed. Errors: ${errors.map(e => e.message).join(', ')}`);
  }
}

export const searchManager = new SearchManager();
