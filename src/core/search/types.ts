import type { SearchQuery, SearchResult } from '@/types/search';

export interface SearchProvider {
  name: string;
  search(query: SearchQuery): Promise<SearchResult[]>;
}
