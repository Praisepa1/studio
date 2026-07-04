export type LeadSource = 'linkedin' | 'website' | 'manual' | 'other';

export interface Lead {
  id: string;
  companyId: string;
  name: string;
  title: string;
  email?: string;
  linkedinUrl?: string;
  status: 'new' | 'contacted' | 'qualified' | 'lost';
  source: LeadSource;
  createdAt: string;
  updatedAt: string;
  outreachScore?: number;
  recentActivity?: string;
  platform?: string;
  company?: string;
  companyName?: string;
}

export interface LeadScore {
  leadId: string;
  score: number;
  factors: Record<string, number>;
  lastCalculatedAt: string;
}
