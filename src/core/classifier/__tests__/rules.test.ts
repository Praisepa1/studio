import { expect, test, describe } from 'vitest';
import { applyHeuristics } from '../rules';

describe('Heuristic Rules', () => {
  test('matches government domain', () => {
    const res = applyHeuristics({ url: 'https://example.gov' });
    expect(res?.category).toBe('government');
    expect(res?.recommended_action).toBe('skip');
  });

  test('matches education domain', () => {
    const res = applyHeuristics({ url: 'https://university.edu' });
    expect(res?.category).toBe('education');
  });

  test('matches LinkedIn jobs', () => {
    const res = applyHeuristics({ url: 'https://linkedin.com/jobs/view/123' });
    expect(res?.category).toBe('job_board');
    expect(res?.recommended_action).toBe('crawl');
  });

  test('matches LinkedIn individual profile', () => {
    const res = applyHeuristics({ url: 'https://www.linkedin.com/in/johndoe' });
    expect(res?.category).toBe('social_profile');
    expect(res?.recommended_action).toBe('skip');
  });

  test('matches known ATS by domain', () => {
    const res = applyHeuristics({ url: 'https://jobs.lever.co/company' });
    expect(res?.category).toBe('ats');
    expect(res?.sub_signal).toBe('Lever');
  });

  test('matches company career path', () => {
    const res = applyHeuristics({ url: 'https://random-company.com/careers' });
    expect(res?.category).toBe('company');
    expect(res?.sub_signal).toBe('careers page');
  });

  test('returns null for unknown domain without keyword match', () => {
    const res = applyHeuristics({ url: 'https://unknown-domain.com/blog/article' });
    expect(res).toBeNull();
  });

  test('matches keyword rules if snippet matches', () => {
    const res = applyHeuristics({ url: 'https://unknown-domain.com', title: 'Home', snippet: 'We are a top recruiting agency.' });
    expect(res?.category).toBe('recruitment_agency');
  });
});
