export interface SocialProfile {
  platform: 'linkedin' | 'twitter_x' | 'facebook' | 'instagram' | 'youtube' | 'tiktok' | 'github';
  url: string;
  confidence: 'high' | 'medium';
  evidence: string;
}

export interface SocialLinksResult {
  profiles: SocialProfile[];
  excluded_count: number;
}

export interface ExtractSocialLinksInput {
  html: string;
  url: string;
}

export function extractSocialLinks(input: ExtractSocialLinksInput): SocialLinksResult {
  const { html } = input;
  const profiles: SocialProfile[] = [];
  let excluded_count = 0;

  // Extremely basic URL extraction for social platforms
  const urlRegex = /https?:\/\/(www\.)?(linkedin|twitter|x|facebook|instagram|youtube|tiktok|github)\.com\/[^\s"'<>]+/g;
  const foundUrls = Array.from(new Set(html.match(urlRegex) || []));

  for (const rawUrl of foundUrls) {
    // 1. Exclude share-intent links
    if (rawUrl.includes('/sharer/') || rawUrl.includes('/share?') || rawUrl.includes('intent/tweet') || rawUrl.includes('url=')) {
      excluded_count++;
      continue;
    }

    // 2. Classify and Normalize
    const parsedUrl = new URL(rawUrl);
    const domain = parsedUrl.hostname.replace('www.', '');
    const path = parsedUrl.pathname.replace(/\/$/, ''); // strip trailing slash
    const cleanUrl = `https://${domain}${path}`;

    if (domain === 'linkedin.com') {
      if (path.startsWith('/company/')) {
        profiles.push({ platform: 'linkedin', url: cleanUrl, confidence: 'high', evidence: 'Company path match' });
      } else if (path.startsWith('/in/')) {
        profiles.push({ platform: 'linkedin', url: cleanUrl, confidence: 'medium', evidence: 'Individual profile, not company' });
      }
    } else if (domain === 'twitter.com' || domain === 'x.com') {
      profiles.push({ platform: 'twitter_x', url: cleanUrl, confidence: 'high', evidence: 'Twitter handle match' });
    } else if (domain === 'github.com') {
       const parts = path.split('/').filter(Boolean);
       if (parts.length === 1) { // github.com/{org}
         profiles.push({ platform: 'github', url: cleanUrl, confidence: 'high', evidence: 'Org-style Github match' });
       }
    } else if (domain === 'instagram.com') {
      profiles.push({ platform: 'instagram', url: cleanUrl, confidence: 'high', evidence: 'Instagram profile match' });
    } else if (domain === 'facebook.com') {
      profiles.push({ platform: 'facebook', url: cleanUrl, confidence: 'high', evidence: 'Facebook profile match' });
    } else if (domain === 'youtube.com') {
      profiles.push({ platform: 'youtube', url: cleanUrl, confidence: 'high', evidence: 'YouTube channel match' });
    } else if (domain === 'tiktok.com') {
      profiles.push({ platform: 'tiktok', url: cleanUrl, confidence: 'high', evidence: 'TikTok profile match' });
    }
  }

  // Deal with multiple identical platforms by picking the best confidence (simplification)
  const uniqueProfiles = Array.from(new Map(profiles.map(p => [p.platform, p])).values());

  return { profiles: uniqueProfiles, excluded_count };
}
