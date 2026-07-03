export type JobSource = 'company_site' | 'linkedin' | 'indeed' | 'other';

export interface Job {
  id: string;
  companyId: string;
  title: string;
  description: string;
  requirements: string[];
  postedAt: string;
  url: string;
  source: JobSource;
}
