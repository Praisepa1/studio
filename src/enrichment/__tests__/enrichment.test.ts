import { expect, test, describe, vi } from 'vitest';
import { enrichCompany } from '../company';
import { enrichTechnology } from '../technology';

vi.mock('@/ai/providers', () => ({
  generateWithProvider: vi.fn(async (provider: string, prompt: string) => {
    // If it's a constrained prompt (contains constrained word)
    if (prompt.includes('flagged as too vague') || prompt.includes('Constrained')) {
      return {
        content: JSON.stringify({
          one_liner: 'Acme Corp is a provider of industrial tools.',
          pain_point_hypothesis: 'Acme Corp has a stale copyright year 2019, suggesting website maintenance needs attention.',
          pitch_angle: 'Help Acme Corp migrate their website to React.',
          fit_score_reason: 'Calculated score is 45 due to outdated tech stack and no SSL.'
        }),
        model: 'gemini-mock'
      };
    }

    // First response - return a vague answer to test the quality gate retry!
    return {
      content: JSON.stringify({
        one_liner: 'Acme Corp is a company.',
        pain_point_hypothesis: 'This company may benefit from improved digital presence.',
        pitch_angle: 'Offer consulting.',
        fit_score_reason: 'Neutral score.'
      }),
      model: 'gemini-mock'
    };
  })
}));

describe('Company and Tech Enrichment', () => {
  test('enrichCompany applies quality gate retry and parses specific signals', async () => {
    const company = {
      id: 'company-1',
      name: 'Acme Corp',
      domain: 'acme.com',
      techStack: ['jQuery'],
      createdAt: '',
      updatedAt: '',
      buyingSignals: [
        { type: 'stale_copyright', description: '2019 copyright', weight: -4, present: true, evidence: '' }
      ],
      score: 45,
      tier: 'neutral' as const
    };

    const res = await enrichCompany(company, 'gemini');

    expect(res).toBeDefined();
    expect(res.one_liner).toBe('Acme Corp is a provider of industrial tools.');
    // The retry response has the specific signal "stale copyright" referenced!
    expect(res.pain_point_hypothesis).toContain('stale copyright');
    expect(res.provider_used).toBe('gemini');
  });

  test('enrichTechnology maps dated stack correctly', () => {
    const company = {
      id: 'company-1',
      name: 'Acme Corp',
      domain: 'acme.com',
      industry: 'Manufacturing',
      createdAt: '',
      updatedAt: ''
    };
    
    const stack = {
      detected: [
        { technology: 'jQuery', category: 'framework' as const, confidence: 'medium' as const, evidence: '' }
      ],
      hosting_provider: null,
      modernization_signal: 'dated' as const,
      modernization_reason: ''
    };

    const res = enrichTechnology(stack, company);

    expect(res.upgrade_opportunity).toBe(true);
    expect(res.modernization_label).toContain('Dated stack');
    expect(res.outreach_hook).toContain('Manufacturing');
    expect(res.outreach_hook).toContain('jQuery');
  });
});
