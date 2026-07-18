import { SearchProvider } from './types';
import { SearchQuery, SearchResult } from '@/types/search';
import { withRetry } from './utils';

export class BraveSearchProvider implements SearchProvider {
  name = 'Brave';

  async search(query: SearchQuery): Promise<SearchResult[]> {
    const apiKey = process.env.BRAVE_API_KEY;
    if (!apiKey) {
      throw new Error('BRAVE_API_KEY environment variable is not set');
    }

    return withRetry(async () => {
      const url = new URL('https://api.search.brave.com/res/v1/web/search');
      url.searchParams.set('q', query.term);
      if (query.limit) {
        url.searchParams.set('count', query.limit.toString());
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Brave Search API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Brave API response:', data);
      const results: SearchResult[] = (data.web?.results || []).map((item: any) => ({
        title: item.title,
        url: item.url,
        snippet: item.description,
        provider: this.name,
        category: query.category
      }));

      return results;
    });
  }
}
