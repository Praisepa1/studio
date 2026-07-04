export interface Company {
  id: string;
  name: string;
  domain: string;
  industry?: string;
  size?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  isActivelyHiring?: boolean;
  techStack?: string[];
  socialLinks?: string[];
  contactEmail?: string;
  contactPhone?: string;
  location?: string;
}

export interface CompanyScore {
  companyId: string;
  score: number;
  factors: Record<string, number>;
  lastCalculatedAt: string;
}
