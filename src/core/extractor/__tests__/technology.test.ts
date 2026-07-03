import { expect, test, describe } from 'vitest';
import { detectTechStack } from '../technology';

describe('Technology Extractor', () => {
  test('detects WordPress and WooCommerce', () => {
    const res = detectTechStack({
      html: '<script src="/wp-content/themes/abc/script.js"></script>',
      url: 'https://example.com'
    });
    expect(res.detected.some(t => t.technology === 'WordPress')).toBe(true);
  });

  test('detects React and Google Analytics', () => {
    const res = detectTechStack({
      html: '<div data-reactroot></div> <script src="googletagmanager.com"></script>',
      url: 'https://example.com'
    });
    expect(res.detected.some(t => t.technology === 'React')).toBe(true);
    expect(res.detected.some(t => t.technology === 'Google Analytics')).toBe(true);
    expect(res.modernization_signal).toBe('current');
  });

  test('detects Vercel hosting from headers', () => {
    const res = detectTechStack({
      html: '<html></html>',
      headers: { 'x-vercel-id': '123' },
      url: 'https://example.com'
    });
    expect(res.hosting_provider).toBe('Vercel');
  });
  
  test('dated signal for jQuery only', () => {
    const res = detectTechStack({
      html: '<script src="jquery.min.js"></script>',
      url: 'https://example.com'
    });
    expect(res.detected.some(t => t.technology === 'jQuery')).toBe(true);
    expect(res.modernization_signal).toBe('dated');
  });
});
