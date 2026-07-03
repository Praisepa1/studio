import { URLCategory } from './search';

export interface BuyingSignal {
  id: string;
  companyId: string;
  signalType: 'funding' | 'hiring' | 'leadership_change' | 'news' | 'other';
  evidence: string;
  urgencyScore: number;
  detectedAt: string;
}

export interface DiscoveryPipeline {
  id: string;
  query: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  companiesFound: number;
  signalsFound: number;
}
