import { expect, test, describe } from 'vitest';
import { detectBuyingSignals } from '../buying-signals';
import { scoreCompany } from '../company';
import { scoreLead } from '../lead';
import { auditWebsite } from '../../intelligence/website-audit';
import { detectHiringSignals } from '../../intelligence/hiring-signals';
import { buildCompanyProfile } from '../../intelligence/company-profile';
import type { PageResult } from '../../core/crawler/page-crawler';

describe('Scoring & Intelligence Verification', () => {
  const dummyHtml = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <script>gtag('config', 'UA-12345');</script>
      </head>
      <body>
        <h1>Welcome to Acme Corp</h1>
        <p>This is the official homepage of Acme Corp. We make cool things.</p>
        <p>Copyright © 2026 Acme Corp. All rights reserved.</p>
      </body>
    </html>
  `;

  test('detectBuyingSignals detects correct positive and negative signals', () => {
    const res = detectBuyingSignals({
      url: 'https://acme.com',
      html: dummyHtml,
      headers: {},
      load_time_ms: 1000,
      tech_stack: {
        detected: [
          { technology: 'Google Analytics', category: 'analytics', confidence: 'high', evidence: '' },
          { technology: 'React', category: 'framework', confidence: 'high', evidence: '' }
        ],
        hosting_provider: null,
        modernization_signal: 'current',
        modernization_reason: ''
      },
      contacts: {
        emails: [{ address: 'john@acme.com', confidence: 'high', context: '' }],
        phones: [],
        addresses: [],
        named_contacts: [],
        source_url: 'https://acme.com'
      }
    });

    // no_ssl shouldn't be present since it starts with https
    expect(res.signals.some(s => s.type === 'no_ssl')).toBe(false);

    // modern_stack (+3) and clear_contact_path (+2) should be present
    expect(res.signals.some(s => s.type === 'modern_stack')).toBe(true);
    expect(res.signals.some(s => s.type === 'clear_contact_path')).toBe(true);

    const totalWeight = res.signals.reduce((sum, s) => sum + s.weight, 0);
    // modern_stack (+3), clear_contact_path (+2), no_ssl not present, viewport present (so no negative), etc.
    expect(totalWeight).toBeGreaterThan(0);
  });

  test('scoreCompany normalizes score and tier correctly', () => {
    const signals = [
      { type: 'active_hiring', present: true, description: '', weight: 7, evidence: '' },
      { type: 'modern_stack', present: true, description: '', weight: 3, evidence: '' }
    ];
    const res = scoreCompany({
      signals,
      company: { domain: 'acme.com' }
    });

    expect(res.score).toBe(75); // 50 + (10 * (50/20)) = 75
    expect(res.tier).toBe('warm');
    expect(res.pitch_angle).toContain('active hiring');
  });

  test('scoreLead calculates expanded signals correctly', () => {
    const lead = {
      id: 'lead-1',
      name: 'Jane Doe',
      title: 'Founder & CEO',
      email: 'jane@acme.com',
      source: 'linkedin' as const,
      companyId: 'company-1',
      status: 'new' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const score = scoreLead(lead);
    // name (+5), title (+5), company (+5), source: linkedin (+30) -> raw 45
    // platform_match (+5), decision_maker_role (+6), outreach_ready (+3) -> 45 + 14 = 59
    // Math.min(10, Math.round(59 / 10)) = 6
    expect(score).toBe(6);
  });

  test('auditWebsite identifies mobile layout, SSL, and health correctly', () => {
    const audit = auditWebsite({
      url: 'https://acme.com',
      html: dummyHtml,
      headers: {},
      load_time_ms: 1000
    });

    expect(audit.ssl_valid).toBe(true);
    expect(audit.mobile_ready).toBe(true);
    expect(audit.page_speed).toBe('fast');
    expect(audit.analytics_present).toBe(true);
    expect(audit.copyright_year).toBe(2026);
    expect(audit.overall_health).toBe('good');
  });

  test('detectHiringSignals finds careers indicator', () => {
    const pages: PageResult[] = [
      {
        success: true,
        url: 'https://acme.com/careers',
        resolvedUrl: 'https://acme.com/careers',
        status: 200,
        title: 'Careers',
        html: '',
        text_content: 'join our team',
        load_time_ms: 100,
        page_type: 'careers'
      }
    ];

    const signals = detectHiringSignals({ pages });
    expect(signals.careers_page_exists).toBe(true);
    expect(signals.signal_strength).toBe('moderate'); // careers page but no listings
  });

  test('buildCompanyProfile synthesizes full profile', () => {
    const profile = buildCompanyProfile({
      start_url: 'https://acme.com',
      crawl_result: {
        pages: [
          {
            success: true,
            url: 'https://acme.com',
            resolvedUrl: 'https://acme.com',
            status: 200,
            title: 'Welcome to Acme Corp',
            html: '<meta name="description" content="ACME makes things.">',
            text_content: '',
            load_time_ms: 100,
            page_type: 'homepage'
          }
        ],
        meta: { pages_crawled: 1, pages_skipped: 0, skip_reasons: [], crawl_duration_ms: 100 }
      },
      contacts: {
        emails: [{ address: 'hello@acme.com', confidence: 'high', context: '' }],
        phones: [{ number: '+1234', confidence: 'medium', context: '' }],
        addresses: [{ text: 'Plot 12, Lagos', context: '' }],
        named_contacts: [],
        source_url: 'https://acme.com'
      },
      tech_stack: {
        detected: [{ technology: 'React', category: 'framework', confidence: 'high', evidence: '' }],
        hosting_provider: null,
        modernization_signal: 'current',
        modernization_reason: ''
      },
      social_links: {
        profiles: [{ platform: 'linkedin', url: 'https://linkedin.com/company/acme', confidence: 'high', evidence: '' }],
        excluded_count: 0
      },
      buying_signals: { signals: [], signal_summary: '' },
      company_score: { score: 75, tier: 'warm', itemized_signals: [], top_3_signals: [], pitch_angle: '' },
      website_audit: { ssl_valid: true, mobile_ready: true, page_speed: 'fast', analytics_present: true, copyright_year: 2026, overall_health: 'good' },
      hiring_signals: { careers_page_exists: false, active_listings: 0, most_recent_posting: null, departments_hiring: [], hiring_language_present: false, signal_strength: 'none' }
    });

    expect(profile.name).toBe('Acme Corp'); // Title minus "Welcome to"
    expect(profile.description).toBe('ACME makes things.');
    expect(profile.location).toBe('Plot 12, Lagos');
    expect(profile.contactEmail).toBe('hello@acme.com');
    expect(profile.contactPhone).toBe('+1234');
    expect(profile.techStack).toContain('React');
    expect(profile.socialLinks).toContain('https://linkedin.com/company/acme');
  });
});
