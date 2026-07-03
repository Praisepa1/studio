import { URLCategory } from '@/types/search';

export type Confidence = 'high' | 'medium' | 'low';
export type RecommendedAction = 'crawl' | 'skip' | 'crawl_with_caution';

export interface ClassificationResult {
  category: URLCategory | 'ignore';
  confidence: Confidence;
  reasoning: string;
  recommended_action: RecommendedAction;
  sub_signal?: string | null;
}

export interface ClassificationInput {
  url: string;
  title?: string;
  snippet?: string;
  source_intent?: 'find_company' | 'find_job' | 'find_lead';
}
