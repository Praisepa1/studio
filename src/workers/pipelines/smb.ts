import { searchManager } from '@/core/search/manager';
import { classifyURL } from '@/core/classifier/ai-classifier';
import { getCachedCompanyId, setCachedCompanyId } from '@/lib/redis';
import { crawlerQueue, crawlerQueueEvents } from '@/lib/queue/crawler-queue';
import type { CrawlResult } from '@/core/crawler/site-crawler';
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
import { getAtsPlatform, normalizeDomain, normalizeName } from './company';

async function deduplicateAndMergeSMB(candidate: any, supabase: any) {
  const normCandDomain = normalizeDomain(candidate.domain || '');
  const normCandName = normalizeName(candidate.name || '');

  const { data: existingByDomain } = await supabase.from('smbs').select('*').eq('domain', normCandDomain);
  let existing = (existingByDomain && existingByDomain.length > 0) ? existingByDomain[0] : null;

  if (!existing && normCandName) {
    const { data: allSMBs } = await supabase.from('smbs').select('*');
    if (allSMBs) {
      existing = allSMBs.find((c: any) => {
        const normExistName = normalizeName(c.name || '');
        return normExistName === normCandName || normalizeDomain(c.domain || '') === normCandDomain;
      }) || null;
    }
  }

  if (existing) {
    const mergedTechStack = Array.from(new Set([...(existing.tech_stack || []), ...(candidate.techStack || [])]));
    const mergedSocialLinks = Array.from(new Set([...(existing.social_links || []), ...(candidate.socialLinks || [])]));

    // Merge enrichment objects, keeping existing values and adding new ones.
    // description lives inside enrichment, not as a top-level column.
    const mergedEnrichment = {
      ...(candidate.enrichment || {}),
      ...(existing.enrichment || {}),
      ...(candidate.description ? { description: candidate.description } : {}),
    };

    const merged = {
      ...existing,
      name: existing.name || candidate.name,
      domain: normCandDomain,
      industry: existing.industry || candidate.industry,
      size: existing.size || candidate.size,
      isActivelyHiring: existing.is_actively_hiring !== undefined ? existing.is_actively_hiring : candidate.isActivelyHiring,
      techStack: mergedTechStack,
      socialLinks: mergedSocialLinks,
      contactEmail: existing.contact_email || candidate.contactEmail,
      contactPhone: existing.contact_phone || candidate.contactPhone,
      location: existing.location || candidate.location,
      score: candidate.score !== undefined ? candidate.score : existing.score,
      tier: candidate.tier || existing.tier,
      enrichment: mergedEnrichment,
    };
    return { decision: 'merge' as const, record: merged, matchedId: existing.id };
  }
  return { decision: 'new' as const, record: candidate };
}

function mapToDatabaseRecord(smb: any, runId?: string) {
  // Fold description into enrichment JSONB — description is NOT a top-level column.
  const enrichment = {
    ...(smb.enrichment || {}),
    ...(smb.description ? { description: smb.description } : {}),
  };

  const dbRecord: any = {
    name: smb.name,
    domain: normalizeDomain(smb.domain || ''),
    industry: smb.industry || null,
    location: smb.location || null,
    business_type: smb.size || smb.business_type || null,
    score: smb.score || 0,
    tier: smb.tier || null,
    is_actively_hiring: smb.isActivelyHiring !== undefined ? smb.isActivelyHiring : false,
    tech_stack: smb.techStack || smb.tech_stack || [],
    social_links: smb.socialLinks || smb.social_links || [],
    contact_email: smb.contactEmail || smb.contact_email || null,
    phone: smb.contactPhone || smb.phone || null,
    enrichment: Object.keys(enrichment).length > 0 ? enrichment : null,
    updated_at: new Date().toISOString(),
  };

  if (runId) {
    dbRecord.discovered_by_run_id = runId;
  }

  // Don't set `id` on new inserts — let the DB generate it.
  // Only set `id` when updating an existing record.
  if (smb.id) {
    dbRecord.id = smb.id;
  }

  return dbRecord;
}

export async function runSMBPipeline(runId: string, userId: string, config: any, broadcastProgress: (data: any) => Promise<void>, supabase: any) {
  const { keywords, industry, location, maxResults } = config;
  const limit = Math.min(maxResults && typeof maxResults === 'number' ? maxResults : 5, 10);
  
  // Specific SMB search strategy
  const termParts = [keywords];
  if (industry) termParts.push(industry);
  if (location) termParts.push(`in ${location}`);
  // Add SMB-specific hints
  termParts.push('("local business" OR "small business")');
  
  const term = termParts.join(' ');

  await broadcastProgress({ stage: 'searching', progress: 10, message: 'Initiating SMB search...', target: 'smb', results: [] });
  const searchResults = await searchManager.search({
    term, limit, targetType: 'smb', category: 'company_site',
  });

  if (searchResults.length === 0) {
    await broadcastProgress({
      stage: 'done', progress: 100, message: 'No SMB results found.',
      target: 'smb', results: [], total_found: 0, total_scored: 0,
    });
    return;
  }

  await broadcastProgress({ stage: 'classifying', progress: 25, message: `Classifying and checking cache for ${searchResults.length} search results...`, target: 'smb', results: [] });
  const classifiedUrls: string[] = [];
  const processedSMBs: any[] = [];
  
  // Deduplicate search results by URL before processing
  const uniqueUrls = new Set<string>();
  const uniqueSearchResults = [];
  for (const r of searchResults) {
    const normUrl = r.url.toLowerCase().trim();
    if (!uniqueUrls.has(normUrl)) {
      uniqueUrls.add(normUrl);
      uniqueSearchResults.push(r);
    }
  }

  for (const result of uniqueSearchResults) {
    const cachedCompanyId = await getCachedCompanyId(result.url);
    const classification = await classifyURL({ url: result.url, title: result.title, snippet: result.snippet });
    if (classification.recommended_action !== 'skip') {
      classifiedUrls.push(result.url);
    }
  }

  if (classifiedUrls.length === 0) {
    await broadcastProgress({
      stage: 'done', progress: 100, message: 'All results classified as skip.',
      target: 'smb', results: [], total_found: searchResults.length, total_scored: 0,
    });
    return;
  }

  for (let idx = 0; idx < classifiedUrls.length; idx++) {
    const url = classifiedUrls[idx];
    const stepPrefix = `[SMB ${idx + 1}/${classifiedUrls.length}]`;

    await broadcastProgress({ stage: 'crawling', progress: 40, message: `${stepPrefix} Crawling site structure (Background worker)...`, target: 'smb', results: [] });
    
    // Use jobId to deduplicate crawls concurrently across pipelines
    const crawlJob = await crawlerQueue.add('crawl', { url, options: { max_pages: 5 } }, { jobId: `crawl:${url}` });
    const crawlResult = await crawlJob.waitUntilFinished(crawlerQueueEvents) as CrawlResult;
    
    const pages = crawlResult.pages || [];
    if (pages.length === 0) continue;

    await broadcastProgress({ stage: 'extracting', progress: 60, message: `${stepPrefix} Extracting SMB contacts...`, target: 'smb', results: [] });
    
    const emailsMap = new Map<string, any>();
    const phonesMap = new Map<string, any>();
    const addressesSet = new Set<string>();
    const techDetectedMap = new Map<string, any>();
    const socialProfilesMap = new Map<string, any>();
    const jobListingsList: any[] = [];

    for (const page of pages) {
      const pageContacts = extractContacts({ html: page.html, text_content: page.text_content || '', page_type: page.page_type || 'other', url: page.url });
      pageContacts.emails.forEach(e => emailsMap.set(e.address.toLowerCase(), e));
      pageContacts.phones.forEach(p => phonesMap.set(p.number, p));
      pageContacts.addresses.forEach(a => addressesSet.add(typeof a === 'string' ? a : a.text));

      const pageTech = detectTechStack({ html: page.html, url: page.url });
      pageTech.detected.forEach(t => techDetectedMap.set(t.technology.toLowerCase(), t));

      const pageSocial = extractSocialLinks({ html: page.html, url: page.url });
      pageSocial.profiles.forEach(p => socialProfilesMap.set(`${p.platform}:${p.url.toLowerCase()}`, p));

      const pageJobs = extractJobListings({ html: page.html, page_type: page.page_type, ats_platform: getAtsPlatform(page.url) });
      jobListingsList.push(...pageJobs.listings);
    }

    const consolidatedContacts = {
      emails: Array.from(emailsMap.values()), phones: Array.from(phonesMap.values()),
      addresses: Array.from(addressesSet).map(addr => ({ text: addr, context: '' })),
      named_contacts: [], source_url: url,
    };

    const consolidatedTechStack = {
      detected: Array.from(techDetectedMap.values()), hosting_provider: null,
      modernization_signal: 'unknown' as const, modernization_reason: 'Analyzed from HTML.',
    };

    const consolidatedJobListings = {
      listings: jobListingsList,
      meta: { total_listings_found: jobListingsList.length, extraction_method: 'static_html' as const, recency_summary: jobListingsList.length > 0 ? 'Active' : 'No active' },
    };

    await broadcastProgress({ stage: 'scoring', progress: 75, message: `${stepPrefix} Running scoring matrix...`, target: 'smb', results: [] });
    
    const primaryPage = pages[0];
    const websiteAudit = auditWebsite({ url, html: primaryPage.html, headers: {}, load_time_ms: 1000 });
    const buyingSignals = detectBuyingSignals({ url, html: primaryPage.html, headers: {}, load_time_ms: 1000, tech_stack: consolidatedTechStack, job_listings: consolidatedJobListings, contacts: consolidatedContacts });
    const companyScore = scoreCompany({ signals: buyingSignals.signals, company: { domain: url } });

    // Reuse buildCompanyProfile, but it works fine for SMBs
    const smbProfile = buildCompanyProfile({ start_url: url, crawl_result: crawlResult, contacts: consolidatedContacts as any, tech_stack: consolidatedTechStack, social_links: { profiles: Array.from(socialProfilesMap.values()), excluded_count: 0 }, buying_signals: buyingSignals, company_score: companyScore, website_audit: websiteAudit, hiring_signals: { signal_strength: 'none', departments_hiring: [], careers_page_exists: false, active_listings: 0, most_recent_posting: null, hiring_language_present: false } });

    const smbToEnrich: any = { ...smbProfile, score: companyScore.score, tier: companyScore.tier, buyingSignals: buyingSignals.signals };

    await broadcastProgress({ stage: 'enriching', progress: 85, message: `${stepPrefix} Performing AI positioning analysis...`, target: 'smb', results: [] });
    const enrichedSMB = await analyzeCompany(smbToEnrich); // Rename analysis later if needed

    await broadcastProgress({ stage: 'storing', progress: 95, message: `${stepPrefix} Deduplicating and writing to Supabase...`, target: 'smb', results: [] });
    const dedup = await deduplicateAndMergeSMB(enrichedSMB, supabase);
    const dbRecord = mapToDatabaseRecord(dedup.record, runId);

    let finalSavedRecord;
    if (dedup.decision === 'merge') {
      // Existing record found by application-level dedup — update it.
      const { data: updated, error: updateErr } = await supabase
        .from('smbs')
        .update(dbRecord)
        .eq('id', dedup.matchedId)
        .select()
        .single();
      if (updateErr) {
        console.error("Failed to update SMB in Supabase:", updateErr);
        throw new Error(`Supabase update error: ${updateErr.message}`);
      }
      finalSavedRecord = updated;
    } else {
      // New record — use upsert with onConflict on domain as a safety net
      // against race conditions (two concurrent runs discovering the same domain).
      delete dbRecord.id; // Let DB generate UUID for new rows
      const { data: upserted, error: upsertErr } = await supabase
        .from('smbs')
        .upsert(dbRecord, { onConflict: 'domain' })
        .select()
        .single();
      if (upsertErr) {
        console.error("Failed to upsert SMB into Supabase:", upsertErr);
        throw new Error(`Supabase upsert error: ${upsertErr.message}`);
      }
      finalSavedRecord = upserted;
    }

    if (finalSavedRecord) {
      processedSMBs.push(finalSavedRecord);
    }
  }

  await broadcastProgress({ stage: 'done', progress: 100, message: `Finished pipeline for ${processedSMBs.length} SMBs.`, target: 'smb', results: processedSMBs, total_found: searchResults.length, total_scored: processedSMBs.length });
  await supabase.from('pipeline_runs').update({ status: 'completed', completed_at: new Date().toISOString(), summary_counts: { total_found: searchResults.length, total_scored: processedSMBs.length } }).eq('id', runId);
}
