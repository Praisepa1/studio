import { expect, test, describe } from 'vitest';
import { extractJobListings } from '../jobs';

describe('Job Listings Extractor', () => {
  test('extracts Lever ATS pattern', () => {
    const html = `
      <div class="posting">
        <a href="https://jobs.lever.co/company/123">Software Engineer</a>
        <span class="sort-by-team">Engineering</span>
        <span class="sort-by-location">Remote</span>
      </div>
    `;
    const res = extractJobListings({ html, page_type: 'careers', ats_platform: 'Lever' });
    expect(res.meta.extraction_method).toBe('ats_pattern');
    expect(res.listings).toHaveLength(1);
    expect(res.listings[0].title).toBe('Software Engineer');
    expect(res.listings[0].department).toBe('Engineering');
    expect(res.listings[0].location).toBe('Remote');
  });

  test('extracts static html fallback', () => {
    const html = `<h2>Senior Engineer</h2>`;
    const res = extractJobListings({ html, page_type: 'careers', ats_platform: null });
    expect(res.meta.extraction_method).toBe('static_html');
    expect(res.listings).toHaveLength(1);
    expect(res.listings[0].title).toBe('Senior Engineer');
  });
  
  test('returns empty properly', () => {
    const res = extractJobListings({ html: 'just some text', page_type: 'careers', ats_platform: null });
    expect(res.listings).toHaveLength(0);
    expect(res.meta.recency_summary).toBe('No open roles found');
  });
});
