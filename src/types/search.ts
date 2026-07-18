export type URLCategory = 'company_site' | 'news' | 'job_board' | 'social' | 'other';

export interface SearchQuery {
  term: string;
  category?: URLCategory;
  limit?: number;
  targetType?: 'company' | 'job' | 'smb' | 'individual' | 'rfp' | 'all' | string;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  provider: string;
  category?: URLCategory;
}

export interface SearchProvider {
  name: string;
  search(query: SearchQuery): Promise<SearchResult[]>;
}
