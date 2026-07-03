export interface Company {
  id: string;
  name: string;
  domain: string;
  industry?: string;
  size?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyScore {
  companyId: string;
  score: number;
  factors: Record<string, number>;
  lastCalculatedAt: string;
}
