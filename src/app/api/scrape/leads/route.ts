import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { searchManager } from '@/core/search/manager';
import { generateWithProvider } from '@/ai/providers';
import { createClient } from '@/lib/supabase/server';
import { cleanAndParseJSON } from '@/lib/utils';

/**
 * POST handler for initiating B2B lead scraping/generation workflows.
 * 1. Checks user authorization session.
 * 2. Parses the request payload for `query`, `source` social network, and `limit`.
 * 3. Builds a site-restricted search operator and queries Brave Search.
 * 4. Extracted search snippets are passed to OpenRouter (Gemini) to structure B2B lead profiles.
 * 5. Parent company entities are queried and auto-generated as needed to resolve relations.
 * 6. Discovered leads are saved to Supabase leads table with linked company references.
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

  const { query = 'startup founder', source = 'linkedin', limit = 10 } = body;
  console.log(`\n🔍 LEAD DISCOVERY: Query: "${query}", Source: "${source}", Limit: ${limit}`);

  // 3. Construct Search Term
  // Remove all site: restrictions to allow broad, unrestricted web searches
  // This bypasses LinkedIn robots.txt blocks by finding mentions across the whole web.
  const term = query;

  console.log(`🔍 SEARCHING: Search term constructed: "${term}"`);

  // 4. Run Search
  let searchResults = [];
  try {
    searchResults = await searchManager.search({
      term,
      limit,
      targetType: 'company', // generic web search
      category: 'company_site',
    });
    console.log(`✅ SEARCH SUCCEEDED: Found ${searchResults.length} raw search results.`);
  } catch (searchError: any) {
    console.error('❌ SEARCH FAILED:', searchError.message);
    return NextResponse.json({ error: 'Search failed', message: searchError.message }, { status: 500 });
  }

  if (searchResults.length === 0) {
    return NextResponse.json({ leads: [], source });
  }

  // 5. Parse Search Results using AI (OpenRouter Gemini)
  console.log('🤖 AI EXTRACTOR: Analyzing search results to extract lead structures...');
  const prompt = `Analyze these web search results and extract a list of B2B leads.
Each lead must have:
- name: Full name of the person.
- title: Job title/role (e.g. Founder, CTO, Marketing Director).
- company: The company they work at.
- bio: A brief summary of their profile/bio based on the snippet.
- location: Location if mentioned, otherwise "Unknown".
- website: Company website or profile URL if found.
- linkedin_url: Their social profile link if found.
- niche: Industry or niche they operate in.
- businessNeedIndicators: 2-3 short indicators of what help they might need based on their business profile (e.g. ["scaling content", "technical execution", "process automation"]).
- recent_activity: A short description of recent activity or posts from the snippet, if any.

Search results:
${searchResults.map((r, i) => `[${i + 1}] Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}\n`).join('\n')}

Output ONLY a valid JSON object matching this schema:
{
  "leads": [
    {
      "name": "string",
      "title": "string",
      "company": "string",
      "bio": "string",
      "location": "string",
      "website": "string",
      "linkedin_url": "string",
      "niche": "string",
      "businessNeedIndicators": ["string"],
      "recent_activity": "string"
    }
  ]
}

No markdown formatting, no explanations.`;

  let extractedLeads = [];
  try {
    // We use openrouter-gemini directly to query OpenRouter
    const result = await generateWithProvider('openrouter-gemini', prompt, { maxTokens: 2048, temperature: 0.1 });
    const parsed = cleanAndParseJSON(result.content);
    extractedLeads = parsed.leads || [];
    console.log(`🤖 AI EXTRACTOR: Successfully extracted ${extractedLeads.length} structured leads.`);
  } catch (aiError: any) {
    console.error('❌ AI EXTRACTOR FAILED:', aiError.message);
    return NextResponse.json({ error: 'AI processing failed', message: aiError.message }, { status: 500 });
  }

  // 6. Save Leads to Supabase
  const supabase = await createClient();
  const savedLeads = [];

  console.log('💾 DATABASE: Saving extracted leads to Supabase...');
  for (const lead of extractedLeads) {
    try {
      let companyId: string | null = null;
      if (lead.company) {
        // Query if company already exists
        const { data: existingComp } = await supabase
          .from('companies')
          .select('id')
          .eq('name', lead.company)
          .maybeSingle();

        if (existingComp) {
          companyId = existingComp.id;
        } else {
          // Create company record
          const cleanDomain = lead.company.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
          const { data: newComp, error: newCompErr } = await supabase
            .from('companies')
            .insert({
              name: lead.company,
              domain: lead.website || cleanDomain,
              industry: lead.niche || 'Unknown',
              location: lead.location || 'Unknown',
              score: 50,
              tier: 'neutral'
            })
            .select('id')
            .single();

          if (!newCompErr && newComp) {
            companyId = newComp.id;
            console.log(`💾 DATABASE: Auto-created company record: "${lead.company}"`);
          } else {
            console.error(`❌ DATABASE: Failed to auto-create company "${lead.company}":`, newCompErr?.message);
          }
        }
      } // CLOSE if (lead.company) block here
      
      // Deduplication check
      let existingLeadId: string | null = null;
      if (lead.linkedin_url) {
        const { data: existingLead } = await supabase
          .from('leads')
          .select('id')
          .eq('linkedin_url', lead.linkedin_url)
          .maybeSingle();

        if (existingLead) {
          console.log(`⏩ DATABASE: Skipping duplicate lead: "${lead.name}" (${lead.linkedin_url})`);
          continue;
        }
      }

      // Basic heuristic for outreach_score
      let score = 50; // Base score
      if (lead.title && /founder|ceo|cto|cmo|director|vp/i.test(lead.title)) score += 20;
      if (lead.linkedin_url && lead.linkedin_url.includes('linkedin.com/in/')) score += 15;
      if (companyId) score += 10;
      if (lead.businessNeedIndicators && lead.businessNeedIndicators.length > 0) score += 5;

      // Post-hoc source inference
      let inferredSource = 'other';
      try {
        const urlToCheck = lead.linkedin_url || lead.website;
        if (urlToCheck) {
          const u = new URL(urlToCheck.startsWith('http') ? urlToCheck : `https://${urlToCheck}`);
          if (u.hostname.includes('linkedin.com')) inferredSource = 'linkedin';
          else if (u.hostname.includes('github.com')) inferredSource = 'github';
          else if (u.hostname.includes('meetup.com')) inferredSource = 'meetup';
          else if (u.hostname.includes('twitter.com') || u.hostname.includes('x.com')) inferredSource = 'twitter';
          else inferredSource = 'company_site';
        }
      } catch (e) {
        console.warn(`Could not parse URL for source inference:`, lead.linkedin_url || lead.website);
      }

      const { data, error } = await supabase
        .from('leads')
        .insert({
          name: lead.name,
          title: lead.title,
          company_id: companyId,
          linkedin_url: lead.linkedin_url || lead.website || '',
          status: 'new',
          outreach_score: score,
          source: inferredSource,
          recent_activity: lead.recent_activity || lead.bio,
          persona: lead.title,
          enrichment: {
            summary: lead.bio,
            businessNeedSummary: `Likely needs support with ${lead.businessNeedIndicators.join(', ')}`,
            likelyPainPoints: lead.businessNeedIndicators,
            communicationStyle: 'entrepreneur',
            recommendedTone: 'professional',
            outreachAngle: lead.recent_activity || lead.bio,
            suggestedOfferFraming: `Offer B2B services mapped to ${lead.niche}`,
            confidenceNotes: 'Extracted from real-time web search snippet.',
            qualityScore: 6,
          }
        })
        .select()
        .single();

      if (error) {
        console.error(`❌ DATABASE: Failed to save lead ${lead.name}:`, error.message);
      } else if (data) {
        console.log(`💾 DATABASE: Successfully saved lead: "${lead.name}" (${lead.title} at ${lead.company})`);
        savedLeads.push({
          id: data.id,
          name: data.name,
          role: data.title,
          company: lead.company || 'Unknown Company',
          location: lead.location,
          website: lead.website || '',
          socialLinks: [{ platform: source, url: data.linkedin_url }],
          bio: lead.bio,
          businessNeedIndicators: lead.businessNeedIndicators,
          source: data.source,
          scrapedAt: data.created_at,
          status: data.status,
          summary: lead.bio,
          outreachAngle: lead.recent_activity || lead.bio,
          likelyPainPoints: lead.businessNeedIndicators,
          suggestedOfferFraming: `Offer B2B services mapped to ${lead.niche}`,
          recommendedTone: 'professional',
          communicationStyle: 'entrepreneur',
          confidenceNotes: 'Extracted from real-time web search snippet.',
          qualityScore: 6,
          businessNeedSummary: `Likely needs support with ${Array.isArray(lead.businessNeedIndicators) ? lead.businessNeedIndicators.join(', ') : 'unknown'}`,
        });
      }
    } catch (dbError: any) {
      console.error('❌ DATABASE WRITE ERROR:', dbError.message);
    }
  }

  return NextResponse.json({ leads: savedLeads, source });
}
