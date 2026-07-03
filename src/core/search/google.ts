import { SearchProvider } from './types';
import { SearchQuery, SearchResult } from '@/types/search';
import { withRetry } from './utils';

export class GoogleSearchProvider implements SearchProvider {
  name = 'Google';

  async search(query: SearchQuery): Promise<SearchResult[]> {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX;

    if (!apiKey || !cx) {
      throw new Error('GOOGLE_SEARCH_API_KEY or GOOGLE_SEARCH_CX environment variable is not set');
    }

    return withRetry(async () => {
      const url = new URL('https://www.googleapis.com/customsearch/v1');
      url.searchParams.set('key', apiKey);
      url.searchParams.set('cx', cx);
      url.searchParams.set('q', query.term);
      if (query.limit) {
        url.searchParams.set('num', query.limit.toString());
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`Google Search API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const results: SearchResult[] = (data.items || []).map((item: any) => ({
        title: item.title,
        url: item.link,
        snippet: item.snippet,
        provider: this.name,
        category: query.category
      }));

      return results;
    });
  }
}
