import { expect, test, describe } from 'vitest';
import { reconcileCompanyData } from '../company';

describe('Company Data Synthesis', () => {
  test('synthesizes full company record', () => {
    const res = reconcileCompanyData({
      domain: 'acmecorp.com',
      name: 'Acme Corp',
      contacts: {
        emails: [{ address: 'hello@acmecorp.com', confidence: 'high', context: '' }],
        phones: [{ number: '+1234567890', confidence: 'medium', context: '' }],
        addresses: [],
        named_contacts: [],
        source_url: 'https://acmecorp.com'
      },
      techStack: {
        detected: [{ technology: 'React', category: 'framework', confidence: 'high', evidence: '' }],
        hosting_provider: null,
        modernization_signal: 'current',
        modernization_reason: ''
      },
      social: {
        profiles: [{ platform: 'twitter_x', url: 'https://twitter.com/acme', confidence: 'high', evidence: '' }],
        excluded_count: 0
      },
      jobs: {
        listings: [{ title: 'Engineer', listing_url: 'url', location: null, department: null, employment_type: null, posted_date: null }],
        meta: { total_listings_found: 1, extraction_method: 'static_html', recency_summary: '' }
      }
    });

    expect(res.domain).toBe('acmecorp.com');
    expect(res.name).toBe('Acme Corp');
    expect(res.isActivelyHiring).toBe(true);
    expect(res.techStack).toContain('React');
    expect(res.socialLinks).toContain('https://twitter.com/acme');
    expect(res.contactEmail).toBe('hello@acmecorp.com');
    expect(res.contactPhone).toBe('+1234567890');
  });
});
