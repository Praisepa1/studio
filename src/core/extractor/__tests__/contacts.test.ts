import { expect, test, describe } from 'vitest';
import { extractContacts } from '../contacts';

describe('Contacts Extractor', () => {
  test('extracts emails correctly', () => {
    const res = extractContacts({
      html: '<div>Email: hello@acmecorp.com</div>',
      text_content: 'Email: hello@acmecorp.com',
      page_type: 'contact',
      url: 'https://acmecorp.com/contact'
    });
    expect(res.emails).toHaveLength(1);
    expect(res.emails[0].address).toBe('hello@acmecorp.com');
    expect(res.emails[0].confidence).toBe('high');
  });

  test('filters out image extensions', () => {
    const res = extractContacts({
      html: 'logo.png bg.jpg',
      text_content: 'logo.png bg.jpg',
      page_type: 'home',
      url: 'https://example.com'
    });
    expect(res.emails).toHaveLength(0);
  });

  test('extracts Nigerian addresses', () => {
    const res = extractContacts({
      html: '',
      text_content: 'Plot 14, Adeola Odeku Street, Victoria Island, Lagos',
      page_type: 'contact',
      url: 'https://example.com'
    });
    expect(res.addresses).toHaveLength(1);
    expect(res.addresses[0].text).toContain('Plot 14');
  });

  test('extracts named contacts', () => {
    const res = extractContacts({
      html: '',
      text_content: 'Jane Doe, Founder',
      page_type: 'team',
      url: 'https://example.com/team'
    });
    expect(res.named_contacts).toHaveLength(1);
    expect(res.named_contacts[0].name).toBe('Jane Doe');
    expect(res.named_contacts[0].role).toBe('Founder');
  });
});
