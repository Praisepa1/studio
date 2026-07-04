import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { searchManager } from '@/core/search/manager';
import { classifyURL } from '@/core/classifier/ai-classifier';
import { crawlSite } from '@/core/crawler/site-crawler';
import { extractContacts } from '@/core/extractor/contacts';
import { detectTechStack } from '@/core/extractor/technology';
import { extractSocialLinks } from '@/core/extractor/social';
import { extractJobListings } from '@/core/extractor/jobs';
import { detectBuyingSignals } from '@/scoring/buying-signals';
import { auditWebsite } from '@/intelligence/website-audit';
import { detectHiringSignals } from '@/intelligence/hiring-signals';
import { buildCompanyProfile } from '@/intelligence/company-profile';
import { scoreCompany } from '@/scoring/company';
import { analyzeCompany } from '@/ai/flows/company-analyzer';
import { checkRateLimit } from '@/lib/ratelimit';
import type { Company } from '@/types/company';

// Helper for ATS platform detection
function getAtsPlatform(url: string): string | null {
  const u = url.toLowerCase();
  if (u.includes('lever.co')) return 'Lever';
  if (u.includes('greenhouse.io')) return 'Greenhouse';
  if (u.includes('bamboohr.com')) return 'BambooHR';
  if (u.includes('workday')) return 'Workday';
  return null;
}

// Deduplication Helper
function normalizeDomain(d: string): string {
  return d.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
}

function normalizeName(n: string): string {
  return n
    .toLowerCase()
    .replace(/\b(inc|inc\.|llc|llc\.|ltd|ltd\.|limited|corp|corp\.|corporation|co|co\.|company|group)\b/g, '')
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function deduplicateAndMergeCompany(candidate: any, supabase: any) {
  const normCandDomain = normalizeDomain(candidate.domain || '');
  const normCandName = normalizeName(candidate.name || '');

  // 1. Fetch by exact domain
  const { data: existingByDomain } = await supabase
    .from('companies')
    .select('*')
    .eq('domain', normCandDomain);

  let existing = (existingByDomain && existingByDomain.length > 0) ? existingByDomain[0] : null;

  // 2. Fetch by name if domain not matched
  if (!existing && normCandName) {
    const { data: allCompanies } = await supabase
      .from('companies')
      .select('*');

    if (allCompanies) {
      existing = allCompanies.find((c: any) => {
        const normExistName = normalizeName(c.name || '');
        return normExistName === normCandName || normalizeDomain(c.domain || '') === normCandDomain;
      }) || null;
    }
  }

  if (existing) {
    // Merge arrays
    const mergedTechStack = Array.from(
      new Set([...(existing.techStack || []), ...(candidate.techStack || [])])
    );
    const mergedSocialLinks = Array.from(
      new Set([...(existing.socialLinks || []), ...(candidate.socialLinks || [])])
    );

    const merged = {
      ...existing,
      name: existing.name || candidate.name,
      domain: existing.domain || candidate.domain,
      industry: existing.industry || candidate.industry,
      size: existing.size || candidate.size,
      description: existing.description || candidate.description,
      isActivelyHiring: existing.isActivelyHiring !== undefined ? existing.isActivelyHiring : candidate.isActivelyHiring,
      techStack: mergedTechStack,
      socialLinks: mergedSocialLinks,
      contactEmail: existing.contactEmail || candidate.contactEmail,
      contactPhone: existing.contactPhone || candidate.contactPhone,
      location: existing.location || candidate.location,
      score: candidate.score !== undefined ? candidate.score : existing.score,
      tier: candidate.tier || existing.tier,
      enrichment: existing.enrichment || candidate.enrichment,
      updatedAt: new Date().toISOString(),
    };

    return { decision: 'merge', record: merged, matchedId: existing.id };
  }

  return { decision: 'new', record: candidate };
}

export async function POST(request: Request) {
  const startTime = Date.now();

  // 1. Auth Guard
  const session = await getAuthSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  // 2. Rate Limit: 20 discovery runs per day (24 hours)
  const rateLimitResult = await checkRateLimit(userId, 20, 24);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too Many Requests', message: 'Rate limit exceeded. 20 discovery runs per day.' },
      { status: 429 }
    );
  }

  // 3. Parse Request
  let body: any;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  const { keywords, industry, location, maxResults } = body;
  if (!keywords || typeof keywords !== 'string') {
    return NextResponse.json({ error: 'Bad Request', message: 'keywords field is required' }, { status: 400 });
  }

  const limit = Math.min(maxResults && typeof maxResults === 'number' ? maxResults : 5, 10);
  const termParts = [keywords];
  if (industry) termParts.push(industry);
  if (location) termParts.push(location);
  const term = termParts.join(' ');

  // 4. Create Response Stream (SSE)
  const responseStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const sendSSE = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const supabase = await createClient();

        // Stage 1: Searching
        sendSSE({ stage: 'searching', progress: 10, message: 'Initiating search engines...' });
        const searchResults = await searchManager.search({
          term,
          limit,
          targetType: 'company',
          category: 'company_site',
        });

        if (searchResults.length === 0) {
          sendSSE({
            stage: 'storing',
            progress: 100,
            message: 'No search results found.',
            companies: [],
            total_found: 0,
            total_scored: 0,
            pipeline_duration_ms: Date.now() - startTime,
          });
          controller.close();
          return;
        }

        // Stage 2: Classifying
        sendSSE({ stage: 'classifying', progress: 25, message: `Classifying ${searchResults.length} search results...` });
        const classifiedUrls: string[] = [];
        for (const result of searchResults) {
          const classification = await classifyURL({
            url: result.url,
            title: result.title,
            snippet: result.snippet,
          });
          if (classification.recommended_action !== 'skip') {
            classifiedUrls.push(result.url);
          }
        }

        if (classifiedUrls.length === 0) {
          sendSSE({
            stage: 'storing',
            progress: 100,
            message: 'All results classified as skip.',
            companies: [],
            total_found: searchResults.length,
            total_scored: 0,
            pipeline_duration_ms: Date.now() - startTime,
          });
          controller.close();
          return;
        }

        const processedCompanies: Company[] = [];

        // Loop through kept URLs and run remaining stages
        for (let idx = 0; idx < classifiedUrls.length; idx++) {
          const url = classifiedUrls[idx];
          const stepPrefix = `[Website ${idx + 1}/${classifiedUrls.length}]`;

          // Stage 3: Crawling
          sendSSE({ stage: 'crawling', progress: 40, message: `${stepPrefix} Crawling site structure...` });
          const crawlResult = await crawlSite(url, { max_pages: 5 });
          const pages = crawlResult.pages || [];
          if (pages.length === 0) continue;

          // Stage 4: Extracting
          sendSSE({ stage: 'extracting', progress: 60, message: `${stepPrefix} Extracting tech stack, contacts, and careers...` });
          
          // Consolidation
          const emailsMap = new Map<string, any>();
          const phonesMap = new Map<string, any>();
          const addressesSet = new Set<string>();
          const namedContactsMap = new Map<string, any>();
          const techDetectedMap = new Map<string, any>();
          let hostingProvider: string | null = null;
          let modernizationSignal: 'current' | 'dated' | 'unmaintained' | 'unknown' = 'unknown';
          let modernizationReason = '';
          const socialProfilesMap = new Map<string, any>();
          const jobListingsList: any[] = [];

          for (const page of pages) {
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

            const pageTech = detectTechStack({ html: page.html, url: page.url });
            pageTech.detected.forEach(t => techDetectedMap.set(t.technology.toLowerCase(), t));
            if (pageTech.hosting_provider) {
              hostingProvider = pageTech.hosting_provider;
            }
            if (pageTech.modernization_signal === 'unmaintained') {
              modernizationSignal = 'unmaintained';
              modernizationReason = pageTech.modernization_reason;
            } else if (pageTech.modernization_signal === 'dated' && modernizationSignal !== 'unmaintained') {
              modernizationSignal = 'dated';
              modernizationReason = pageTech.modernization_reason;
            } else if (pageTech.modernization_signal === 'current' && modernizationSignal === 'unknown') {
              modernizationSignal = 'current';
              modernizationReason = pageTech.modernization_reason;
            }

            const pageSocial = extractSocialLinks({ html: page.html, url: page.url });
            pageSocial.profiles.forEach(p => socialProfilesMap.set(`${p.platform}:${p.url.toLowerCase()}`, p));

            const pageJobs = extractJobListings({
              html: page.html,
              page_type: page.page_type,
              ats_platform: getAtsPlatform(page.url),
            });
            jobListingsList.push(...pageJobs.listings);
          }

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
            modernization_reason: modernizationReason || 'Analyzed from HTML.',
          };

          const consolidatedSocialLinks = {
            profiles: Array.from(socialProfilesMap.values()),
            excluded_count: 0,
          };

          const consolidatedJobListings = {
            listings: jobListingsList,
            meta: {
              total_listings_found: jobListingsList.length,
              extraction_method: 'static_html' as const,
              recency_summary: jobListingsList.length > 0 ? 'Active listings found' : 'No active listings found',
            },
          };

          // Stage 5: Scoring & Intelligence
          sendSSE({ stage: 'scoring', progress: 75, message: `${stepPrefix} Running B2B scoring matrix...` });
          
          const primaryPage = pages[0];
          const websiteAudit = auditWebsite({
            url,
            html: primaryPage.html,
            headers: {},
            load_time_ms: 1000,
          });

          const hiringSignals = detectHiringSignals({
            pages,
            job_listings: consolidatedJobListings,
          });

          const buyingSignals = detectBuyingSignals({
            url,
            html: primaryPage.html,
            headers: {},
            load_time_ms: 1000,
            tech_stack: consolidatedTechStack,
            job_listings: consolidatedJobListings,
            contacts: consolidatedContacts,
          });

          const companyScore = scoreCompany({
            signals: buyingSignals.signals,
            company: { domain: url },
          });

          const companyProfile = buildCompanyProfile({
            start_url: url,
            crawl_result: crawlResult,
            contacts: consolidatedContacts as any,
            tech_stack: consolidatedTechStack,
            social_links: consolidatedSocialLinks,
            buying_signals: buyingSignals,
            company_score: companyScore,
            website_audit: websiteAudit,
            hiring_signals: hiringSignals,
          });

          // Attach scoring metadata to company object temporarily for flow
          const companyToEnrich: any = {
            ...companyProfile,
            score: companyScore.score,
            tier: companyScore.tier,
            buyingSignals: buyingSignals.signals,
            hiringStatus: hiringSignals.signal_strength,
            departmentsHiring: hiringSignals.departments_hiring,
          };

          // Stage 6: Enriching
          sendSSE({ stage: 'enriching', progress: 85, message: `${stepPrefix} Performing AI positioning analysis...` });
          const enrichedCompany = await analyzeCompany(companyToEnrich);

          // Stage 7: Deduplication & Storing
          sendSSE({ stage: 'storing', progress: 95, message: `${stepPrefix} Deduplicating and writing to Supabase...` });
          const dedup = await deduplicateAndMergeCompany(enrichedCompany, supabase);

          let finalSavedRecord;
          if (dedup.decision === 'merge') {
            const { data: updated } = await supabase
              .from('companies')
              .update(dedup.record)
              .eq('id', dedup.matchedId)
              .select()
              .single();
            finalSavedRecord = updated;
          } else {
            const { data: inserted } = await supabase
              .from('companies')
              .insert(dedup.record)
              .select()
              .single();
            finalSavedRecord = inserted;
          }

          if (finalSavedRecord) {
            processedCompanies.push(finalSavedRecord);
          }
        }

        // Send Final Event
        sendSSE({
          stage: 'storing',
          progress: 100,
          message: `Finished pipeline for ${processedCompanies.length} companies.`,
          companies: processedCompanies,
          total_found: searchResults.length,
          total_scored: processedCompanies.length,
          pipeline_duration_ms: Date.now() - startTime,
        });

        controller.close();
      } catch (err: any) {
        console.error('SSE pipeline failed:', err);
        sendSSE({
          stage: 'storing',
          progress: 100,
          message: `Pipeline failed: ${err.message}`,
          companies: [],
          total_found: 0,
          total_scored: 0,
          pipeline_duration_ms: Date.now() - startTime,
        });
        controller.close();
      }
    },
  });

  return new Response(responseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
