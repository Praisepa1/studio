export * from './company';
export * from './lead';
export * from './job';
export * from './search';
export * from './discovery';

// Preserve other necessary types from before (without Gig)
export type AIProvider = 'gemini' | 'claude' | 'gemini-claude' | 'openrouter-gemini' | 'openrouter-claude' | 'openrouter-pipeline' | 'openrouter-free';

// ─── Proposal Types ──────────────────────────────────────────
export type ProposalStyle = 'concise' | 'premium' | 'technical' | 'friendly';

export interface Proposal {
  id: string;
  jobId: string; // Changed from gigId to jobId for B2B pivot
  jobTitle?: string; // Changed from gigTitle
  content: string;
  style: ProposalStyle;
  provider: AIProvider;
  model?: string;
  generatedAt: string;
  feedback?: 'positive' | 'negative' | 'edited' | null;
  editedContent?: string;
  outcome?: 'sent' | 'won' | 'lost' | 'pending' | null;
  geminiDraft?: string;
  claudeRefinement?: string;
}

// ─── Outreach Types ──────────────────────────────────────────
export type OutreachType = 'first_message' | 'follow_up' | 'closing';
export type OutreachChannel = 'email' | 'dm' | 'linkedin' | 'facebook';
export type OutreachTone = 'professional' | 'friendly' | 'direct' | 'premium';

export interface OutreachMessage {
  id: string;
  leadId: string;
  leadName?: string;
  type: OutreachType;
  channel: OutreachChannel;
  tone: OutreachTone;
  content: string;
  provider: AIProvider;
  model?: string;
  generatedAt: string;
  feedback?: 'positive' | 'negative' | 'edited' | null;
  editedContent?: string;
  outcome?: 'sent' | 'replied' | 'no_response' | 'converted' | null;
  geminiDraft?: string;
  claudeRefinement?: string;
}

// ─── Feedback Types ──────────────────────────────────────────
export type FeedbackType = 'proposal' | 'outreach' | 'lead_research' | 'company_analysis';
export type FeedbackRating = 1 | 2 | 3 | 4 | 5;

export interface FeedbackEntry {
  id: string;
  type: FeedbackType;
  referenceId: string;
  referenceTitle?: string;
  rating: FeedbackRating;
  sentiment: 'positive' | 'negative' | 'edited';
  notes?: string;
  provider: AIProvider | 'manual';
  outcome?: string;
  betterProvider?: AIProvider;
  createdAt: string;
}

// ─── CRM Export Types ────────────────────────────────────────
export interface CRMExport {
  id: string;
  type: 'leads' | 'companies';
  status: 'pending' | 'completed' | 'failed';
  format: 'csv' | 'excel';
  url?: string;
  createdAt: string;
}

// ─── AI Generation Types ─────────────────────────────────────
export interface GenerationResult {
  content: string;
  provider: AIProvider;
  model: string;
  geminiDraft?: string;
  claudeRefinement?: string;
  generatedAt: string;
}

// ─── Dashboard Types ─────────────────────────────────────────
export interface ActivityItem {
  id: string;
  type: 'job_found' | 'lead_found' | 'proposal_generated' | 'outreach_sent' | 'feedback_received' | 'company_found';
  title: string;
  description: string;
  timestamp: string;
}

export interface DashboardStats {
  totalCompanies: number;
  totalLeads: number;
  totalProposals: number;
  totalOutreach: number;
  conversionRate: number;
  activeScrapingJobs: number;
  recentActivity: ActivityItem[];
}
