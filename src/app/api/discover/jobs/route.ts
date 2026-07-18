export const maxDuration = 300;
import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { searchManager } from '@/core/search/manager';
import { classifyURL } from '@/core/classifier/ai-classifier';
import { crawlSite } from '@/core/crawler/site-crawler';
import { extractJobListings } from '@/core/extractor/jobs';
import { randomUUID } from 'crypto';
import type { Job, JobSource } from '@/types/job';

export const dynamic = 'force-dynamic';


// Helper for ATS platform detection
function getAtsPlatform(url: string): string | null {
  const u = url.toLowerCase();
  if (u.includes('lever.co')) return 'Lever';
  if (u.includes('greenhouse.io')) return 'Greenhouse';
  if (u.includes('bamboohr.com')) return 'BambooHR';
  if (u.includes('workday')) return 'Workday';
  return null;
}

/**
 * POST handler for initiating active employment job discovery flows.
 * 1. Checks user authorization session.
 * 2. Compiles search keywords, locations, and industries.
 * 3. Runs site searches for target career/portal links via searchManager.
 * 4. Filters candidate links to isolate valid job boards and applicant tracking systems (ATS).
 * 5. Crawls the target portal links and extracts structured job postings.
 * 6. Upserts normalized jobs to Supabase jobs table aligned to defined schemas.
 */
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

  const { keywords, location, industry } = body;
  if (!keywords || typeof keywords !== 'string') {
    return NextResponse.json({ error: 'Bad Request', message: 'keywords is required' }, { status: 400 });
  }

  const termParts = [keywords];
  if (industry) termParts.push(industry);
  if (location) termParts.push(location);
  const term = termParts.join(' ');

  try {
    // 1. SearchManager.search() with targetType: "job"
    const searchResults = await searchManager.search({
      term,
      limit: 20,
      targetType: 'job',
      category: 'job_board',
    });

    const sourcesUsed = Array.from(new Set(searchResults.map(r => r.provider)));

    // 2. For each result, classifyURL() - keep only "job_board" and "ats"
    const keptUrls: string[] = [];
    for (const result of searchResults) {
      const classification = await classifyURL({
        url: result.url,
        title: result.title,
        snippet: result.snippet,
      });

      if (classification.category === 'job_board' || classification.category === 'ats') {
        keptUrls.push(result.url);
      }
    }

    const discoveredJobs: Job[] = [];

    // 3. crawlSite() on each kept URL (single_page mode)
    const supabase = await createClient();
    
    for (const url of keptUrls) {
      try {
        const crawlResult = await crawlSite(url, { max_pages: 1 });
        const pages = crawlResult.pages || [];
        
        for (const page of pages) {
          // 4. extractJobListings() from core/extractor/jobs.ts
          const listingsResult = extractJobListings({
            html: page.html,
            page_type: page.page_type,
            ats_platform: getAtsPlatform(page.url),
          });

          // Determine JobSource based on domain name
          let source: JobSource = 'other';
          const domain = url.toLowerCase();
          if (domain.includes('indeed')) source = 'indeed';
          else if (domain.includes('linkedin')) source = 'linkedin';

          // 5. Normalize each extracted listing to Job type
          for (const listing of listingsResult.listings) {
            const jobData: any = {
              id: randomUUID(),
              company_id: null,
              title: listing.title,
              description: `Discovered job posting from careers portal: ${listing.title}. Location: ${listing.location || 'N/A'}. Department: ${listing.department || 'N/A'}. Employment Type: ${listing.employment_type || 'N/A'}.`,
              requirements: [],
              posted_at: listing.posted_date || new Date().toISOString(),
              url: listing.listing_url || url,
              source,
            };
            discoveredJobs.push(jobData);
          }
        }
      } catch (crawlErr) {
        console.warn(`Failed to crawl job board/ats URL ${url}:`, crawlErr);
      }
    }

    // 6. Upsert to Supabase jobs table
    if (discoveredJobs.length > 0) {
      const { error: upsertError } = await supabase
        .from('jobs')
        .upsert(discoveredJobs, { onConflict: 'url' });

      if (upsertError) {
        console.error('Failed to upsert jobs:', upsertError);
        return NextResponse.json({ error: 'Database upsert failure', message: upsertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      jobs: discoveredJobs,
      total: discoveredJobs.length,
      sources: sourcesUsed,
    });
  } catch (error: any) {
    console.error('Job discovery failed:', error);
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
  }
}
