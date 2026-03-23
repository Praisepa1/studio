// ============================================================
// JobJet Platform — Core Type Definitions
// ============================================================

export type AIProvider = 'gemini' | 'claude' | 'gemini-claude';

// ─── Gig Types ───────────────────────────────────────────────

export interface GigBudget {
  type: 'fixed' | 'hourly';
  min?: number;
  max?: number;
  currency?: string;
}

export interface GigClientHistory {
  totalSpent?: number;
  hires?: number;
  rating?: number;
  reviews?: number;
  memberSince?: string;
  location?: string;
}

export type GigStatus = 'new' | 'saved' | 'applied' | 'won' | 'lost' | 'archived';
export type ExperienceLevel = 'entry' | 'intermediate' | 'expert';
export type ProjectType = 'short' | 'long' | 'ongoing';

export interface Gig {
  id: string;
  title: string;
  description: string;
  budget: GigBudget;
  skills: string[];
  clientHistory?: GigClientHistory;
  postedAt: string;
  experienceLevel?: ExperienceLevel;
  projectType?: ProjectType;
  url: string;
  status: GigStatus;
  source: 'upwork';
  scrapedAt: string;
  // AI Enrichment
  summary?: string;
  proposalAngles?: string[];
  likelyClientTone?: string;
  likelyPainPoints?: string[];
  conversionScore?: number;
  recommendedStyle?: string;
  clientProfileSummary?: string;
  likelyObjections?: string[];
  bestMessageAngle?: string;
}

// ─── Lead Types ──────────────────────────────────────────────

export interface SocialLink {
  platform: string;
  url: string;
}

export type LeadStatus = 'new' | 'researched' | 'outreach_sent' | 'replied' | 'converted' | 'rejected';
export type LeadSource = 'linkedin' | 'facebook' | 'twitter' | 'manual' | 'other';

export interface Lead {
  id: string;
  name: string;
  company?: string;
  role?: string;
  niche?: string;
  location?: string;
  website?: string;
  socialLinks?: SocialLink[];
  bio?: string;
  businessNeedIndicators?: string[];
  source: LeadSource;
  sourceUrl?: string;
  scrapedAt: string;
  status: LeadStatus;
  // AI Enrichment
  summary?: string;
  outreachAngle?: string;
  likelyPainPoints?: string[];
  suggestedOfferFraming?: string;
  recommendedTone?: string;
  communicationStyle?: string;
  confidenceNotes?: string;
  qualityScore?: number;
  businessNeedSummary?: string;
  likelyObjections?: string[];
}

// ─── Proposal Types ──────────────────────────────────────────

export type ProposalStyle = 'concise' | 'premium' | 'technical' | 'friendly';

export interface Proposal {
  id: string;
  gigId: string;
  gigTitle?: string;
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

export type FeedbackType = 'proposal' | 'outreach' | 'lead_research' | 'gig_analysis';
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

// ─── Scraping Job Types ───────────────────────────────────────

export type ScrapingJobStatus = 'idle' | 'running' | 'completed' | 'failed';
export type ScrapingJobSource = 'upwork' | 'linkedin' | 'facebook' | 'other';

export interface ScrapingJob {
  id: string;
  source: ScrapingJobSource;
  query: string;
  status: ScrapingJobStatus;
  startedAt?: string;
  completedAt?: string;
  itemsFound?: number;
  itemsNew?: number;
  error?: string;
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
  type: 'gig_scraped' | 'lead_found' | 'proposal_generated' | 'outreach_sent' | 'feedback_received';
  title: string;
  description: string;
  timestamp: string;
}

export interface DashboardStats {
  totalGigs: number;
  totalLeads: number;
  totalProposals: number;
  totalOutreach: number;
  conversionRate: number;
  activeScrapingJobs: number;
  recentActivity: ActivityItem[];
}
