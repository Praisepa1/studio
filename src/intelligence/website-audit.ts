export interface WebsiteAuditResult {
  ssl_valid: boolean;
  mobile_ready: boolean;
  page_speed: 'fast' | 'acceptable' | 'slow';
  analytics_present: boolean;
  copyright_year: number | null;
  overall_health: 'good' | 'dated' | 'critical';
}

export function auditWebsite(input: {
  url: string;
  html: string;
  headers: Record<string, string>;
  load_time_ms: number;
}): WebsiteAuditResult {
  const { url, html, load_time_ms } = input;

  // 1. ssl_valid check:
  // Starts with https:// AND no mixed-content patterns in HTML
  const isHttps = url.startsWith('https://');
  const hasMixedContent = /src=["']http:\/\//i.test(html);
  const ssl_valid = isHttps && !hasMixedContent;

  // 2. mobile_ready check:
  // viewport meta tag exists AND no fixed container over 800px
  const hasViewport = html.includes('name="viewport"') || html.includes('name=\'viewport\'');
  const hasFixedWidth = /width:\s*[8-9]\d{2}px|width:\s*\d{4,}px/.test(html) || 
                        /class="[^"]*\b(w-[8-9]\d{2}|w-\d{4,})\b/.test(html);
  const mobile_ready = hasViewport && !hasFixedWidth;

  // 3. page_speed check:
  let page_speed: 'fast' | 'acceptable' | 'slow' = 'acceptable';
  if (load_time_ms < 2000) {
    page_speed = 'fast';
  } else if (load_time_ms > 5000) {
    page_speed = 'slow';
  }

  // 4. analytics_present check:
  // Check for gtag, ga, fbq, hs-scripts, hotjar in HTML
  const analyticsSignatures = [
    'gtag(',
    'googletagmanager.com',
    'google-analytics.com',
    'fbq(',
    'connect.facebook.net',
    'hs-scripts.com',
    'hotjar'
  ];
  const htmlLower = html.toLowerCase();
  const analytics_present = analyticsSignatures.some(sig => htmlLower.includes(sig.toLowerCase()));

  // 5. copyright_year check:
  // Footer copyright year extraction
  let copyright_year: number | null = null;
  const copyrightRegex = /(?:©|&copy;|copyright)\s*(?:[0-9]{4}\s*-\s*)?([0-9]{4})/i;
  const match = html.match(copyrightRegex);
  if (match) {
    const year = parseInt(match[1], 10);
    if (year > 1900 && year <= new Date().getFullYear() + 1) {
      copyright_year = year;
    }
  }

  // 6. overall_health logic:
  // "critical" -> no SSL, or mobile_ready false AND slow speed
  // "dated"    -> any one of: stale copyright (2+ years behind), no analytics, slow speed
  // "good"     -> everything else
  const currentYear = new Date().getFullYear();
  const isStaleCopyright = copyright_year !== null && (currentYear - copyright_year >= 2);

  let overall_health: 'good' | 'dated' | 'critical' = 'good';

  if (!ssl_valid || (!mobile_ready && page_speed === 'slow')) {
    overall_health = 'critical';
  } else if (isStaleCopyright || !analytics_present || page_speed === 'slow') {
    overall_health = 'dated';
  }

  return {
    ssl_valid,
    mobile_ready,
    page_speed,
    analytics_present,
    copyright_year,
    overall_health,
  };
}
