import { randomUUID } from 'crypto';
import type { CrawlResult } from '@/core/crawler/site-crawler';
import type { ContactsResult as ContactResult } from '@/core/extractor/contacts';
import type { TechStackResult } from '@/core/extractor/technology';
import type { SocialLinksResult as SocialLinkResult } from '@/core/extractor/social';
import type { BuyingSignalResult } from '@/scoring/buying-signals';
import type { CompanyScoreResult } from '@/scoring/company';
import type { WebsiteAuditResult } from './website-audit';
import type { HiringSignalResult } from './hiring-signals';
import type { Company } from '@/types';

export interface CompanyEnrichment {
  industry?: string;
  size?: string;
  description?: string;
  [key: string]: any;
}

export function buildCompanyProfile(input: {
  start_url: string;
  crawl_result: CrawlResult;
  contacts: ContactResult;
  tech_stack: TechStackResult;
  social_links: SocialLinkResult;
  buying_signals: BuyingSignalResult;
  company_score: CompanyScoreResult;
  website_audit: WebsiteAuditResult;
  hiring_signals: HiringSignalResult;
  enrichment?: CompanyEnrichment;
}): Company {
  const {
    start_url,
    crawl_result,
    contacts,
    tech_stack,
    social_links,
    hiring_signals,
    enrichment,
  } = input;

  // 1. Get Domain
  let domain = '';
  try {
    domain = new URL(start_url).hostname.replace('www.', '').toLowerCase();
  } catch {
    domain = start_url.toLowerCase();
  }

  // 2. Reconcile Company Name: prefer title of homepage minus common suffixes
  const homepage = crawl_result.pages.find(p => p.page_type === 'homepage' || p.url === start_url);
  let name = '';
  if (homepage && homepage.title) {
    name = homepage.title
      .replace(/\s*-\s*Home\b/gi, '')
      .replace(/\s*\|\s*Home\b/gi, '')
      .replace(/\bWelcome\s+to\s*/gi, '')
      .replace(/\s*-\s*Welcome\b/gi, '')
      .replace(/\s*-\s*Official\s+Site\b/gi, '')
      .replace(/\s*\|\s*Official\s+Site\b/gi, '')
      .trim();
  }
  if (!name) {
    name = domain.split('.')[0];
    name = name.charAt(0).toUpperCase() + name.slice(1);
  }

  // 3. Reconcile Description: prefer meta description, fallback to first homepage paragraph
  let description = enrichment?.description || '';
  if (!description && homepage && homepage.html) {
    const descMatch = homepage.html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
                      homepage.html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
    if (descMatch) {
      description = descMatch[1].trim();
    }
  }
  if (!description && homepage && homepage.text_content) {
    const paragraphs = homepage.text_content.split(/\r?\n/).map(p => p.trim()).filter(p => p.length > 30);
    if (paragraphs.length > 0) {
      description = paragraphs[0];
    }
  }

  // 4. Reconcile Location: prefer contacts.addresses[0]
  const location = contacts.addresses && contacts.addresses.length > 0
    ? contacts.addresses[0].text
    : undefined;

  // 5. Contact Email: prefer direct over generic
  const directEmail = contacts.emails && contacts.emails.find(e => {
    const user = e.address.split('@')[0].toLowerCase();
    const genericPrefixes = ['info', 'contact', 'sales', 'support', 'hello', 'admin', 'office', 'jobs', 'careers', 'team'];
    return !genericPrefixes.includes(user);
  })?.address;
  const contactEmail = directEmail || (contacts.emails && contacts.emails.length > 0 ? contacts.emails[0].address : undefined);

  // 6. Contact Phone
  const contactPhone = contacts.phones && contacts.phones.length > 0
    ? contacts.phones[0].number
    : undefined;

  // 7. Tech Stack
  const techStack = tech_stack.detected && tech_stack.detected.length > 0
    ? Array.from(new Set(tech_stack.detected.map(t => t.technology)))
    : [];

  // 8. Social Links
  const socialLinks = social_links.profiles && social_links.profiles.length > 0
    ? Array.from(new Set(social_links.profiles.map(p => p.url)))
    : [];

  // 9. Industry & Size from enrichment
  const industry = enrichment?.industry || undefined;
  const size = enrichment?.size || undefined;

  const now = new Date().toISOString();

  return {
    id: randomUUID(),
    name,
    domain,
    industry,
    size,
    description: description || undefined,
    createdAt: now,
    updatedAt: now,
    isActivelyHiring: hiring_signals.signal_strength === 'strong' || hiring_signals.signal_strength === 'moderate',
    techStack,
    socialLinks,
    contactEmail,
    contactPhone,
    location,
  };
}
