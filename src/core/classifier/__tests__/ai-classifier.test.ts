import { expect, test, describe, vi } from 'vitest';
import { classifyURL } from '../ai-classifier';

vi.mock('@/ai/genkit', () => ({
  ai: {
    generate: vi.fn().mockResolvedValue({
      output: {
        category: 'company',
        confidence: 'medium',
        reasoning: 'AI decided it based on product mentions',
        recommended_action: 'crawl',
      }
    })
  }
}));

describe('AI Classifier', () => {
  test('returns heuristic if heuristic matches', async () => {
    const res = await classifyURL({ url: 'https://example.gov' });
    expect(res.category).toBe('government'); // from heuristic
  });

  test('falls back to AI if heuristic fails', async () => {
    const res = await classifyURL({ url: 'https://obscure-startup.io', snippet: 'our platform solves x' });
    // This url and snippet falls through domain checks, but "our platform" matches the heuristic keyword rule!
    expect(res.category).toBe('company');
  });

  test('AI is called if no heuristics match at all', async () => {
    const res = await classifyURL({ url: 'https://something.io', snippet: 'completely ambiguous' });
    // AI mock returns 'company'
    expect(res.category).toBe('company');
    expect(res.reasoning).toBe('AI decided it based on product mentions');
  });
});
