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

import { Company } from "./company";

export interface SMB {
  id: string;
  name: string;
  domain: string;
  industry?: string;
  location?: string;
  business_type?: string;
  phone?: string;
  address?: string;
  score: number;
  tier?: string;
  is_actively_hiring: boolean;
  tech_stack: string[];
  social_links: string[];
  contact_email?: string;
  discovered_by_run_id?: string;
  enrichment?: {
    description?: string;
    one_liner?: string;
    pain_point_hypothesis?: string;
    pitch_angle?: string;
    [key: string]: any;
  };
}

export interface JobPosting {
  id: string;
  title: string;
  company_id?: string;
  company_name: string;
  url: string;
  location?: string;
  department?: string;
  salary_range?: string;
  skills: string[];
  remote_policy?: string;
  description?: string;
  score: number;
  tier?: string;
  enrichment?: any;
}

export interface Individual {
  id: string;
  name: string;
  current_role?: string;
  company_name?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  skills: string[];
  location?: string;
  email?: string;
  score: number;
  tier?: string;
  enrichment?: any;
}

export interface RFP {
  id: string;
  title: string;
  agency?: string;
  url: string;
  deadline?: string;
  budget?: string;
  description?: string;
  status?: string;
  score: number;
  tier?: string;
  enrichment?: any;
}

export type DiscoveryResult =
  | { target: "company"; data: Company }
  | { target: "job"; data: JobPosting }
  | { target: "smb"; data: SMB }
  | { target: "individual"; data: Individual }
  | { target: "rfp"; data: RFP };

export type DiscoveryData<T extends DiscoveryResult["target"]> = Extract<DiscoveryResult, { target: T }>["data"];

