export interface DetectedTechnology {
  technology: string;
  category: 'cms' | 'framework' | 'analytics' | 'ecommerce' | 'hosting' | 'marketing_tech' | 'payment' | 'ats';
  confidence: 'high' | 'medium' | 'low';
  evidence: string;
}

export type ModernizationSignal = 'current' | 'dated' | 'unmaintained' | 'unknown';

export interface TechStackResult {
  detected: DetectedTechnology[];
  hosting_provider: string | null;
  modernization_signal: ModernizationSignal;
  modernization_reason: string;
}

export interface DetectTechStackInput {
  html: string;
  headers?: Record<string, string>;
  url: string;
}

export function detectTechStack(input: DetectTechStackInput): TechStackResult {
  const { html, headers = {} } = input;
  const detected: DetectedTechnology[] = [];
  let hosting_provider: string | null = null;
  
  const htmlLower = html.toLowerCase();
  
  // CMS
  if (htmlLower.includes('/wp-content/') || htmlLower.includes('generator" content="wordpress')) {
    detected.push({ technology: 'WordPress', category: 'cms', confidence: 'high', evidence: 'WordPress directories or generator tag found' });
  }
  if (htmlLower.includes('cdn.shopify.com')) {
    detected.push({ technology: 'Shopify', category: 'cms', confidence: 'high', evidence: 'Shopify CDN found' });
  }

  // Frameworks
  let hasModernFramework = false;
  if (htmlLower.includes('data-reactroot') || htmlLower.includes('__next_data__')) {
    detected.push({ technology: 'React', category: 'framework', confidence: 'high', evidence: 'React/Next.js signals found' });
    hasModernFramework = true;
  }
  
  const hasJQuery = htmlLower.includes('jquery.min.js');
  if (hasJQuery) {
    detected.push({ technology: 'jQuery', category: 'framework', confidence: 'medium', evidence: 'jQuery script tag found' });
  }

  // Analytics
  let hasAnalytics = false;
  if (htmlLower.includes('gtag(') || htmlLower.includes('googletagmanager.com')) {
    detected.push({ technology: 'Google Analytics', category: 'analytics', confidence: 'high', evidence: 'Google Analytics scripts found' });
    hasAnalytics = true;
  }

  // Hosting
  if (headers['x-vercel-id']) {
    hosting_provider = 'Vercel';
    detected.push({ technology: 'Vercel', category: 'hosting', confidence: 'high', evidence: 'Vercel headers found' });
  }

  // ATS Platforms (For Jobs Extractor)
  if (htmlLower.includes('lever.co')) {
     detected.push({ technology: 'Lever', category: 'ats', confidence: 'high', evidence: 'Lever scripts/links found' });
  } else if (htmlLower.includes('greenhouse.io')) {
     detected.push({ technology: 'Greenhouse', category: 'ats', confidence: 'high', evidence: 'Greenhouse scripts/links found' });
  }

  // Modernization Logic
  let signal: ModernizationSignal = 'unknown';
  let reason = 'insufficient evidence — fewer than 2 technologies detected';

  if (detected.length >= 2) {
    if (hasModernFramework && hasAnalytics) {
      signal = 'current';
      reason = 'Modern framework and analytics tooling detected';
    } else if (hasJQuery && !hasModernFramework) {
      signal = 'dated';
      reason = 'jQuery present with no modern framework or analytics tooling detected';
    } else {
      signal = 'unknown'; // simplification
    }
  } else if (detected.length === 1 && detected[0].technology === 'jQuery') {
    signal = 'dated';
    reason = 'jQuery present with no modern framework or analytics tooling detected';
  }

  return { detected, hosting_provider, modernization_signal: signal, modernization_reason: reason };
}
