import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { detectBuyingSignals } from '@/scoring/buying-signals';
import { scoreCompany } from '@/scoring/company';
import type { TechStackResult } from '@/core/extractor/technology';
import type { ContactsResult as ContactResult } from '@/core/extractor/contacts';

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

  const { company_id } = body;
  if (!company_id || typeof company_id !== 'string') {
    return NextResponse.json({ error: 'Bad Request', message: 'company_id field is required' }, { status: 400 });
  }

  // 3. Fetch Company from Supabase
  const supabase = await createClient();
  const { data: company, error: fetchError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', company_id)
    .single();

  if (fetchError || !company) {
    console.error('Fetch company failed:', fetchError);
    return NextResponse.json({ error: 'Not Found', message: 'Company record not found' }, { status: 404 });
  }

  // 4. Reconstruct inputs for detectBuyingSignals from stored data
  const techStack: TechStackResult = {
    detected: (company.techStack || []).map((tech: string) => ({
      technology: tech,
      category: 'cms',
      confidence: 'high',
      evidence: 'Retrieved from database',
    })),
    hosting_provider: null,
    modernization_signal: (company as any).modernization_signal || 'unknown',
    modernization_reason: 'Retrieved from database',
  };

  const contacts: ContactResult = {
    emails: company.contactEmail ? [{ address: company.contactEmail, confidence: 'high' as const, context: '' }] : [],
    phones: company.contactPhone ? [{ number: company.contactPhone, confidence: 'high' as const, context: '' }] : [],
    addresses: company.location ? [company.location] : [],
    named_contacts: [],
    source_url: `https://${company.domain}`,
  };

  const jobListings = {
    listings: company.isActivelyHiring
      ? [
          {
            title: 'Open Role',
            location: company.location || null,
            department: null,
            employment_type: null,
            posted_date: null,
            listing_url: '',
          },
        ]
      : [],
    meta: {
      total_listings_found: company.isActivelyHiring ? 1 : 0,
      extraction_method: 'static_html' as const,
      recency_summary: company.isActivelyHiring ? 'Active hiring' : 'No open roles',
    },
  };

  // Re-run detectBuyingSignals on the stored data
  const signalsResult = detectBuyingSignals({
    url: `https://${company.domain}`,
    html: '<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>Copyright © 2026</body></html>',
    headers: {},
    load_time_ms: 1000,
    tech_stack: techStack,
    job_listings: jobListings,
    contacts: contacts,
  });

  // Re-run scoreCompany
  const scoreResult = scoreCompany({
    signals: signalsResult.signals,
    company,
  });

  // 5. Update Company score and tier in Supabase
  const { data: updatedCompany, error: updateError } = await supabase
    .from('companies')
    .update({
      score: scoreResult.score,
      tier: scoreResult.tier,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', company_id)
    .select()
    .single();

  if (updateError) {
    console.error('Update company score failed:', updateError);
    return NextResponse.json({ error: 'Internal Server Error', message: 'Failed to update company score in database' }, { status: 500 });
  }

  return NextResponse.json({
    score: scoreResult.score,
    tier: scoreResult.tier,
    pitch_angle: scoreResult.pitch_angle,
    signals: scoreResult.top_3_signals,
    updated: updatedCompany,
  });
}
