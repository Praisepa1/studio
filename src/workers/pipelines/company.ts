import { createWorkerClient } from "@/lib/supabase/worker";
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

export function getAtsPlatform(url: string): string | null {
  const u = url.toLowerCase();
  if (u.includes('lever.co')) return 'Lever';
  if (u.includes('greenhouse.io')) return 'Greenhouse';
  if (u.includes('bamboohr.com')) return 'BambooHR';
  if (u.includes('workday')) return 'Workday';
  return null;
}

export function normalizeDomain(d: string): string {
  return d.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
}

export function normalizeName(n: string): string {
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

  const { data: existingByDomain } = await supabase.from('companies').select('*').eq('domain', normCandDomain);
  let existing = (existingByDomain && existingByDomain.length > 0) ? existingByDomain[0] : null;

  if (!existing && normCandName) {
    const { data: allCompanies } = await supabase.from('companies').select('*');
    if (allCompanies) {
      existing = allCompanies.find((c: any) => {
        const normExistName = normalizeName(c.name || '');
        return normExistName === normCandName || normalizeDomain(c.domain || '') === normCandDomain;
      }) || null;
    }
  }

  if (existing) {
    const mergedTechStack = Array.from(new Set([...(existing.tech_stack || []), ...(candidate.techStack || [])]));
    const mergedSocialLinks = Array.from(new Set([...(existing.social_links || []), ...(candidate.socialLinks || [])]));

    const merged = {
      ...existing,
      name: existing.name || candidate.name,
      domain: existing.domain || candidate.domain,
      industry: existing.industry || candidate.industry,
      size: existing.size || candidate.size,
      description: existing.description || candidate.description,
      isActivelyHiring: existing.is_actively_hiring !== undefined ? existing.is_actively_hiring : candidate.isActivelyHiring,
      techStack: mergedTechStack,
      socialLinks: mergedSocialLinks,
      contactEmail: existing.contact_email || candidate.contactEmail,
      contactPhone: existing.contact_phone || candidate.contactPhone,
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

function mapToDatabaseRecord(company: any, runId?: string) {
  const enrichment = {
    ...(company.enrichment || {}),
    ...(company.description ? { description: company.description } : {}),
  };

  const dbRecord: any = {
    name: company.name,
    domain: normalizeDomain(company.domain || ''),
    industry: company.industry || null,
    location: company.location || null,
    size: company.size || null,
    score: company.score || 0,
    tier: company.tier || null,
    is_actively_hiring: company.isActivelyHiring !== undefined ? company.isActivelyHiring : false,
    hiring_status: company.hiringStatus || 'none',
    tech_stack: company.techStack || [],
    social_links: company.socialLinks || [],
    contact_email: company.contactEmail || null,
    contact_phone: company.contactPhone || null,
    enrichment: Object.keys(enrichment).length > 0 ? enrichment : null,
    updated_at: new Date().toISOString(),
  };

  if (runId) {
    dbRecord.discovered_by_run_id = runId;
  }

  // Only set id if updating an existing record
  if (company.id) {
    dbRecord.id = company.id;
  }

  return dbRecord;
}

export async function runCompanyPipeline(runId: string, userId: string, config: any, broadcastProgress: (data: any) => Promise<void>, supabase: any) {
  const { keywords, industry, location, maxResults, target } = config;
  const limit = Math.min(maxResults && typeof maxResults === 'number' ? maxResults : 5, 10);
  const actualTarget = target || 'company';
  const termParts = [keywords];
  if (industry) termParts.push(industry);
  if (location) termParts.push(location);
  const term = termParts.join(' ');

  await broadcastProgress({ stage: 'searching', progress: 10, message: 'Initiating search engines...', target: actualTarget, results: [] });
  const searchResults = await searchManager.search({
    term, limit, targetType: actualTarget, category: 'company_site',
  });

  if (searchResults.length === 0) {
    await broadcastProgress({
      stage: 'done', progress: 100, message: 'No search results found.',
      target: actualTarget, results: [], total_found: 0, total_scored: 0,
    });
    return;
  }

  await broadcastProgress({ stage: 'classifying', progress: 25, message: `Classifying and checking cache for ${searchResults.length} search results...`, target: actualTarget, results: [] });
  const classifiedUrls: string[] = [];
  const processedCompanies: any[] = [];
  
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
    if (cachedCompanyId) {
       const { data: cachedCompany } = await supabase.from('companies').select('*').eq('id', cachedCompanyId).single();
       if (cachedCompany) {
         processedCompanies.push(cachedCompany);
        await broadcastProgress({ stage: 'storing', progress: Math.min(95, 25 + (processedCompanies.length * 5)), message: `Restored ${cachedCompany.name} from cache`, target: actualTarget, results: [] });
         continue;
       }
    }
    const classification = await classifyURL({ url: result.url, title: result.title, snippet: result.snippet });
    if (classification.recommended_action !== 'skip') {
      classifiedUrls.push(result.url);
    }
  }

  if (classifiedUrls.length === 0 && processedCompanies.length === 0) {
    await broadcastProgress({
      stage: 'done', progress: 100, message: 'All results classified as skip.',
      target: 'company', results: [], total_found: searchResults.length, total_scored: 0,
    });
    return;
  }

  for (let idx = 0; idx < classifiedUrls.length; idx++) {
    const url = classifiedUrls[idx];
    const stepPrefix = `[Website ${idx + 1}/${classifiedUrls.length}]`;

    await broadcastProgress({ stage: 'crawling', progress: 40, message: `${stepPrefix} Crawling site structure (Background worker)...`, target: actualTarget, results: [] });
    
    // Use jobId to deduplicate crawls concurrently across pipelines
    const crawlJob = await crawlerQueue.add('crawl', { url, options: { max_pages: 5 } }, { jobId: `crawl:${url}` });
    const crawlResult = await crawlJob.waitUntilFinished(crawlerQueueEvents) as CrawlResult;
    
    const pages = crawlResult.pages || [];
    if (pages.length === 0) continue;

    await broadcastProgress({ stage: 'extracting', progress: 60, message: `${stepPrefix} Extracting tech stack, contacts, and careers...`, target: actualTarget, results: [] });
    
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
      const pageContacts = extractContacts({ html: page.html, text_content: page.text_content || '', page_type: page.page_type || 'other', url: page.url });
      pageContacts.emails.forEach(e => emailsMap.set(e.address.toLowerCase(), e));
      pageContacts.phones.forEach(p => phonesMap.set(p.number, p));
      pageContacts.addresses.forEach(a => addressesSet.add(typeof a === 'string' ? a : a.text));
      pageContacts.named_contacts.forEach(c => namedContactsMap.set(c.name.toLowerCase(), c));

      const pageTech = detectTechStack({ html: page.html, url: page.url });
      pageTech.detected.forEach(t => techDetectedMap.set(t.technology.toLowerCase(), t));
      if (pageTech.hosting_provider) hostingProvider = pageTech.hosting_provider;
      if (pageTech.modernization_signal === 'unmaintained') modernizationSignal = 'unmaintained';
      else if (pageTech.modernization_signal === 'dated' && modernizationSignal !== 'unmaintained') modernizationSignal = 'dated';
      else if (pageTech.modernization_signal === 'current' && modernizationSignal === 'unknown') modernizationSignal = 'current';

      const pageSocial = extractSocialLinks({ html: page.html, url: page.url });
      pageSocial.profiles.forEach(p => socialProfilesMap.set(`${p.platform}:${p.url.toLowerCase()}`, p));

      const pageJobs = extractJobListings({ html: page.html, page_type: page.page_type, ats_platform: getAtsPlatform(page.url) });
      jobListingsList.push(...pageJobs.listings);
    }

    const consolidatedContacts = {
      emails: Array.from(emailsMap.values()), phones: Array.from(phonesMap.values()),
      addresses: Array.from(addressesSet).map(addr => ({ text: addr, context: '' })),
      named_contacts: Array.from(namedContactsMap.values()), source_url: url,
    };

    const consolidatedTechStack = {
      detected: Array.from(techDetectedMap.values()), hosting_provider: hostingProvider,
      modernization_signal: modernizationSignal, modernization_reason: 'Analyzed from HTML.',
    };

    const consolidatedJobListings = {
      listings: jobListingsList,
      meta: { total_listings_found: jobListingsList.length, extraction_method: 'static_html' as const, recency_summary: jobListingsList.length > 0 ? 'Active' : 'No active' },
    };

    await broadcastProgress({ stage: 'scoring', progress: 75, message: `${stepPrefix} Running B2B scoring matrix...`, target: actualTarget, results: [] });
    
    const primaryPage = pages[0];
    const websiteAudit = auditWebsite({ url, html: primaryPage.html, headers: {}, load_time_ms: 1000 });
    const hiringSignals = detectHiringSignals({ pages, job_listings: consolidatedJobListings });
    const buyingSignals = detectBuyingSignals({ url, html: primaryPage.html, headers: {}, load_time_ms: 1000, tech_stack: consolidatedTechStack, job_listings: consolidatedJobListings, contacts: consolidatedContacts });
    const companyScore = scoreCompany({ signals: buyingSignals.signals, company: { domain: url } });

    const companyProfile = buildCompanyProfile({ start_url: url, crawl_result: crawlResult, contacts: consolidatedContacts as any, tech_stack: consolidatedTechStack, social_links: { profiles: Array.from(socialProfilesMap.values()), excluded_count: 0 }, buying_signals: buyingSignals, company_score: companyScore, website_audit: websiteAudit, hiring_signals: hiringSignals });

    const companyToEnrich: any = { ...companyProfile, score: companyScore.score, tier: companyScore.tier, buyingSignals: buyingSignals.signals, hiringStatus: hiringSignals.signal_strength, departmentsHiring: hiringSignals.departments_hiring };

    await broadcastProgress({ stage: 'enriching', progress: 85, message: `${stepPrefix} Performing AI positioning analysis...`, target: actualTarget, results: [] });
    const enrichedCompany = await analyzeCompany(companyToEnrich);

    await broadcastProgress({ stage: 'storing', progress: 95, message: `${stepPrefix} Deduplicating and writing to Supabase...`, target: actualTarget, results: [] });
    const dedup = await deduplicateAndMergeCompany(enrichedCompany, supabase);
    const dbRecord = mapToDatabaseRecord(dedup.record, runId);

    let finalSavedRecord;
    if (dedup.decision === 'merge') {
      const { data: updated, error: updateErr } = await supabase
        .from('companies')
        .update(dbRecord)
        .eq('id', dedup.matchedId)
        .select()
        .single();
      if (updateErr) {
        console.error("Failed to update company in Supabase:", updateErr);
        throw new Error(`Supabase update error: ${updateErr.message}`);
      }
      finalSavedRecord = updated;
    } else {
      delete dbRecord.id; // DB generates UUID
      const { data: upserted, error: upsertErr } = await supabase
        .from('companies')
        .upsert(dbRecord, { onConflict: 'domain' })
        .select()
        .single();
      if (upsertErr) {
        console.error("Failed to upsert company into Supabase:", upsertErr);
        throw new Error(`Supabase upsert error: ${upsertErr.message}`);
      }
      finalSavedRecord = upserted;
    }

    if (finalSavedRecord) {
      const companyId = finalSavedRecord.id;
      await setCachedCompanyId(url, companyId);
      
      if (dedup.decision === 'merge') {
        const { error: delContErr } = await supabase.from('contacts').delete().eq('company_id', companyId);
        if (delContErr) console.error("Error deleting old contacts:", delContErr);
        const { error: delJobsErr } = await supabase.from('jobs').delete().eq('company_id', companyId);
        if (delJobsErr) console.error("Error deleting old jobs:", delJobsErr);
        const { error: delSigErr } = await supabase.from('signals').delete().eq('company_id', companyId);
        if (delSigErr) console.error("Error deleting old signals:", delSigErr);
      }

      const contactInserts = [];
      for (const email of consolidatedContacts.emails) contactInserts.push({ company_id: companyId, type: 'email', value: email.address });
      for (const phone of consolidatedContacts.phones) contactInserts.push({ company_id: companyId, type: 'phone', value: phone.number });
      for (const addr of consolidatedContacts.addresses) contactInserts.push({ company_id: companyId, type: 'address', value: addr.text });
      for (const named of consolidatedContacts.named_contacts) contactInserts.push({ company_id: companyId, type: 'named', value: named.name, title: named.title });
      if (contactInserts.length > 0) {
        const { error: insertErr } = await supabase.from('contacts').insert(contactInserts);
        if (insertErr) console.error("Failed to insert contacts:", insertErr);
      }

      if (consolidatedJobListings.listings.length > 0) {
        const jobInserts = consolidatedJobListings.listings.map((j: any) => ({ company_id: companyId, title: j.title, department: j.department || null, location: j.location || null, url: j.url, ats_platform: j.ats_platform || null }));
        const { error: insertErr } = await supabase.from('jobs').insert(jobInserts);
        if (insertErr) console.error("Failed to insert jobs:", insertErr);
      }

      const signalInserts = [];
      for (const s of buyingSignals.signals) signalInserts.push({ company_id: companyId, type: 'buying', signal_name: s.type, strength: s.weight > 0 ? 'positive' : 'negative', details: s });
      if (hiringSignals.signal_strength !== 'none') signalInserts.push({ company_id: companyId, type: 'hiring', signal_name: 'hiring_activity', strength: hiringSignals.signal_strength, details: hiringSignals });
      if (consolidatedTechStack.modernization_signal !== 'unknown') signalInserts.push({ company_id: companyId, type: 'tech', signal_name: 'modernization', strength: consolidatedTechStack.modernization_signal, details: consolidatedTechStack });
      if (signalInserts.length > 0) {
        const { error: insertErr } = await supabase.from('signals').insert(signalInserts);
        if (insertErr) console.error("Failed to insert signals:", insertErr);
      }

      processedCompanies.push(finalSavedRecord);
    }
  }

  await broadcastProgress({ stage: 'done', progress: 100, message: `Finished pipeline for ${processedCompanies.length} companies.`, target: actualTarget, results: processedCompanies, total_found: searchResults.length, total_scored: processedCompanies.length });
  await supabase.from('pipeline_runs').update({ status: 'completed', completed_at: new Date().toISOString(), summary_counts: { total_found: searchResults.length, total_scored: processedCompanies.length } }).eq('id', runId);
}
