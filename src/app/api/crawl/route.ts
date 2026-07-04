import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { classifyURL } from '@/core/classifier/ai-classifier';
import { crawlSite } from '@/core/crawler/site-crawler';
import { extractContacts } from '@/core/extractor/contacts';
import { detectTechStack } from '@/core/extractor/technology';
import { extractSocialLinks } from '@/core/extractor/social';
import { extractJobListings } from '@/core/extractor/jobs';

function getAtsPlatform(url: string): string | null {
  const u = url.toLowerCase();
  if (u.includes('lever.co')) return 'Lever';
  if (u.includes('greenhouse.io')) return 'Greenhouse';
  if (u.includes('bamboohr.com')) return 'BambooHR';
  if (u.includes('workday')) return 'Workday';
  return null;
}

export async function POST(request: Request) {
  // 1. Auth Guard
  const session = await getAuthSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse Request
  let body: any;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  const { url, mode } = body;
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'Bad Request', message: 'url field is required' }, { status: 400 });
  }

  // 3. Classify URL
  const classification = await classifyURL({ url });
  if (classification.recommended_action === 'skip') {
    return NextResponse.json(
      {
        error: 'Classification skip recommended',
        reason: classification.reasoning,
        classification,
      },
      { status: 400 }
    );
  }

  // 4. Crawl Site
  const maxPages = mode === 'single_page' ? 1 : 5;
  let crawlResult;
  try {
    crawlResult = await crawlSite(url, { max_pages: maxPages });
  } catch (error: any) {
    console.error('Crawl failed:', error);
    return NextResponse.json({ error: 'Crawl failed', message: error.message }, { status: 500 });
  }

  const pages = crawlResult.pages || [];
  if (pages.length === 0) {
    return NextResponse.json({ error: 'No pages were crawled successfully' }, { status: 500 });
  }

  // 5. Run extractors on crawled pages and consolidate results
  const emailsMap = new Map<string, any>();
  const phonesMap = new Map<string, any>();
  const addressesSet = new Set<string>();
  const namedContactsMap = new Map<string, any>();

  const techDetectedMap = new Map<string, any>();
  let hostingProvider: string | null = null;
  let modernizationSignal: 'current' | 'dated' | 'unmaintained' | 'unknown' = 'unknown';

  const socialProfilesMap = new Map<string, any>();

  const jobListingsList: any[] = [];

  for (const page of pages) {
    // A. Contacts
    const pageContacts = extractContacts({
      html: page.html,
      text_content: page.text_content || '',
      page_type: page.page_type || 'other',
      url: page.url,
    });
    pageContacts.emails.forEach(e => emailsMap.set(e.address.toLowerCase(), e));
    pageContacts.phones.forEach(p => phonesMap.set(p.number, p));
    pageContacts.addresses.forEach(a => {
      const text = typeof a === 'string' ? a : a.text;
      addressesSet.add(text);
    });
    pageContacts.named_contacts.forEach(c => namedContactsMap.set(c.name.toLowerCase(), c));

    // B. Tech Stack
    const pageTech = detectTechStack({ html: page.html, url: page.url });
    pageTech.detected.forEach(t => techDetectedMap.set(t.technology.toLowerCase(), t));
    if (pageTech.hosting_provider) {
      hostingProvider = pageTech.hosting_provider;
    }
    if (pageTech.modernization_signal === 'unmaintained') {
      modernizationSignal = 'unmaintained';
    } else if (pageTech.modernization_signal === 'dated' && modernizationSignal !== 'unmaintained') {
      modernizationSignal = 'dated';
    } else if (pageTech.modernization_signal === 'current' && modernizationSignal === 'unknown') {
      modernizationSignal = 'current';
    }

    // C. Social Links
    const pageSocial = extractSocialLinks({ html: page.html, url: page.url });
    pageSocial.profiles.forEach(p => socialProfilesMap.set(`${p.platform}:${p.url.toLowerCase()}`, p));

    // D. Job Listings
    const pageJobs = extractJobListings({
      html: page.html,
      page_type: page.page_type,
      ats_platform: getAtsPlatform(page.url),
    });
    jobListingsList.push(...pageJobs.listings);
  }

  const uniqueListingsMap = new Map<string, any>();
  jobListingsList.forEach(job => {
    const key = `${job.title.toLowerCase()}:${(job.location || '').toLowerCase()}`;
    uniqueListingsMap.set(key, job);
  });

  const consolidatedContacts = {
    emails: Array.from(emailsMap.values()),
    phones: Array.from(phonesMap.values()),
    addresses: Array.from(addressesSet).map(addr => ({ text: addr, context: '' })),
    named_contacts: Array.from(namedContactsMap.values()),
    source_url: url,
  };

  const consolidatedTechStack = {
    detected: Array.from(techDetectedMap.values()),
    hosting_provider: hostingProvider,
    modernization_signal: modernizationSignal,
    modernization_reason: `Aggregated from ${pages.length} crawled pages.`,
  };

  const consolidatedSocialLinks = {
    profiles: Array.from(socialProfilesMap.values()),
    excluded_count: 0,
  };

  const consolidatedJobListings = {
    listings: Array.from(uniqueListingsMap.values()),
    meta: {
      total_listings_found: uniqueListingsMap.size,
      extraction_method: 'static_html' as const,
      recency_summary: uniqueListingsMap.size > 0 ? 'Active jobs found' : 'No active jobs found',
    },
  };

  return NextResponse.json({
    pages,
    contacts: consolidatedContacts,
    tech_stack: consolidatedTechStack,
    social_links: consolidatedSocialLinks,
    job_listings: consolidatedJobListings,
  });
}
