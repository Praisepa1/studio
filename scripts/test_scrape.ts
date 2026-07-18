require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { searchManager } = require('../src/core/search/manager');
const { createOpenRouterAdapter } = require('../src/ai/providers/openrouter');
const { createClient } = require('@supabase/supabase-js');

// Reconstruct openrouter-gemini
const geminiAdapter = createOpenRouterAdapter('google/gemini-2.5-flash');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function cleanAndParseJSON(text) {
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON parse error:", e);
    return { leads: [] };
  }
}

async function run() {
  const query = 'startup founder london';
  const source = 'linkedin';
  const limit = 5;
  const term = query;
  
  console.log(`\n🔍 LEAD DISCOVERY: Query: "${query}", Source: "${source}", Limit: ${limit}`);
  
  let searchResults = [];
  try {
    searchResults = await searchManager.search({
      term,
      limit,
      targetType: 'company',
      category: 'company_site',
    });
    console.log(`✅ SEARCH SUCCEEDED: Found ${searchResults.length} raw search results.`);
  } catch (searchError) {
    console.error('❌ SEARCH FAILED:', searchError.message);
    return;
  }

  if (searchResults.length === 0) {
    console.log("No leads from search.");
    return;
  }

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
    const result = await geminiAdapter.generate(prompt, { maxTokens: 2048, temperature: 0.1 });
    const parsed = cleanAndParseJSON(result);
    extractedLeads = parsed.leads || [];
    console.log(`🤖 AI EXTRACTOR: Successfully extracted ${extractedLeads.length} structured leads.`);
    console.log("RAW EXTRACTED:", JSON.stringify(extractedLeads, null, 2));
  } catch (aiError) {
    console.error('❌ AI EXTRACTOR FAILED:', aiError.message);
    return;
  }

  const savedLeads = [];
  console.log('💾 DATABASE: Saving extracted leads to Supabase...');
  for (const lead of extractedLeads) {
    try {
      let companyId = null;
      if (lead.company) {
        const { data: existingComp } = await supabase
          .from('companies')
          .select('id')
          .eq('name', lead.company)
          .maybeSingle();

        if (existingComp) {
          companyId = existingComp.id;
        } else {
          const cleanDomain = lead.company.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
          const { data: newComp, error: newCompErr } = await supabase
            .from('companies')
            .insert({
              name: lead.company,
              domain: lead.website || cleanDomain,
              industry: lead.niche || 'Unknown',
              location: lead.location || 'Unknown',
              score: 50,
              tier: 'neutral',
              description: `Auto-generated company from lead search of ${lead.name}.`,
            })
            .select('id')
            .single();

          if (!newCompErr && newComp) {
            companyId = newComp.id;
            console.log(`💾 DATABASE: Auto-created company record: "${lead.company}"`);
          }
        }
      }
      
      let existingLeadId = null;
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

      let score = 50;
      if (lead.title && /founder|ceo|cto|cmo|director|vp/i.test(lead.title)) score += 20;
      if (lead.linkedin_url && lead.linkedin_url.includes('linkedin.com/in/')) score += 15;
      if (companyId) score += 10;
      if (lead.businessNeedIndicators && lead.businessNeedIndicators.length > 0) score += 5;

      const { data, error } = await supabase
        .from('leads')
        .insert({
          name: lead.name,
          title: lead.title,
          company_id: companyId,
          linkedin_url: lead.linkedin_url || lead.website || '',
          source: source,
          status: 'new',
          enrichment: {
            bio: lead.bio,
            location: lead.location,
            niche: lead.niche,
            businessNeedIndicators: lead.businessNeedIndicators,
            recent_activity: lead.recent_activity,
            communicationStyle: 'entrepreneur',
            recommendedTone: 'professional',
            outreachAngle: lead.recent_activity || lead.bio,
            suggestedOfferFraming: `Offer B2B services mapped to ${lead.niche}`,
            confidenceNotes: 'Extracted from real-time web search snippet.',
            qualityScore: 6,
            businessNeedSummary: `Likely needs support with ${Array.isArray(lead.businessNeedIndicators) ? lead.businessNeedIndicators.join(', ') : 'unknown'}`,
          }
        })
        .select()
        .single();

      if (error) {
        console.error(`❌ DATABASE: Failed to save lead ${lead.name}:`, error.message);
      } else if (data) {
        console.log(`💾 DATABASE: Successfully saved lead: "${lead.name}" (${lead.title} at ${lead.company})`);
        savedLeads.push(data);
      }
    } catch (dbError) {
      console.error('❌ DATABASE WRITE ERROR:', dbError.message);
    }
  }
}

run();
