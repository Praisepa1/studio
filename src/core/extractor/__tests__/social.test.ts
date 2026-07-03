import { expect, test, describe } from 'vitest';
import { extractSocialLinks } from '../social';

describe('Social Links Extractor', () => {
  test('extracts clean profile links', () => {
    const res = extractSocialLinks({
      html: '<a href="https://twitter.com/acmecorp">Twitter</a> <a href="https://linkedin.com/company/acmecorp">LinkedIn</a>',
      url: 'https://acmecorp.com'
    });
    expect(res.profiles).toHaveLength(2);
    expect(res.profiles.some(p => p.platform === 'twitter_x')).toBe(true);
    expect(res.profiles.some(p => p.platform === 'linkedin')).toBe(true);
  });

  test('filters share-intent links', () => {
    const res = extractSocialLinks({
      html: '<a href="https://twitter.com/intent/tweet?url=https://acmecorp.com/blog">Share</a>',
      url: 'https://acmecorp.com/blog'
    });
    expect(res.profiles).toHaveLength(0);
    expect(res.excluded_count).toBe(1);
  });

  test('normalizes trailing slashes', () => {
    const res = extractSocialLinks({
      html: '<a href="https://instagram.com/acmecorp/">Instagram</a>',
      url: 'https://acmecorp.com'
    });
    expect(res.profiles[0].url).toBe('https://instagram.com/acmecorp');
  });
});
