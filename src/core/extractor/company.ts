import { Company } from '@/types/company';
import { ContactsResult } from './contacts';
import { TechStackResult } from './technology';
import { SocialLinksResult } from './social';
import { JobListingsResult } from './jobs';

export interface CompanyExtractionInput {
  domain: string;
  name: string;
  contacts: ContactsResult;
  techStack: TechStackResult;
  social: SocialLinksResult;
  jobs: JobListingsResult;
}

export function reconcileCompanyData(input: CompanyExtractionInput): Partial<Company> {
  const company: Partial<Company> = {
    domain: input.domain,
    name: input.name,
    isActivelyHiring: input.jobs.listings.length > 0,
    techStack: input.techStack.detected.map(t => t.technology),
    socialLinks: input.social.profiles.map(p => p.url)
  };
  
  // Example of reconciling data synthesis rules
  // If we have an email from contacts that ends in domain, it's highly likely to be a primary contact
  if (input.contacts.emails.length > 0) {
     company.contactEmail = input.contacts.emails[0].address;
  }

  // Same for phones
  if (input.contacts.phones.length > 0) {
     company.contactPhone = input.contacts.phones[0].number;
  }

  return company;
}
