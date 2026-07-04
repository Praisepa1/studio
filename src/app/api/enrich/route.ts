import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { analyzeCompany } from '@/ai/flows/company-analyzer';
import { analyzeLead } from '@/ai/flows/lead-analyzer';

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

  const { type, id } = body;
  if (!type || !id || typeof id !== 'string' || (type !== 'company' && type !== 'lead')) {
    return NextResponse.json(
      { error: 'Bad Request', message: 'type must be "company" or "lead", and id must be a string' },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  if (type === 'company') {
    // 3. Fetch Company
    const { data: company, error: fetchError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !company) {
      return NextResponse.json({ error: 'Not Found', message: 'Company record not found' }, { status: 404 });
    }

    // 4. Validate sufficient data
    if (!company.domain) {
      return NextResponse.json(
        { error: 'Unprocessable Entity', message: 'Company record has insufficient data (missing domain)' },
        { status: 422 }
      );
    }

    try {
      // 5. Run AI analyzer flow
      const companyAnalysisResult = await analyzeCompany(company);

      // 6. Update the database
      const { data: updatedCompany, error: updateError } = await supabase
        .from('companies')
        .update({
          enrichment: companyAnalysisResult.enrichment,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('Update company enrichment failed:', updateError);
        return NextResponse.json({ error: 'Internal Server Error', message: 'Failed to save company enrichment' }, { status: 500 });
      }

      return NextResponse.json({ updated: updatedCompany });
    } catch (flowError: any) {
      console.error('Company analyzer flow failed:', flowError);
      return NextResponse.json({ error: 'Internal Server Error', message: flowError.message }, { status: 500 });
    }
  } else {
    // 3. Fetch Lead
    const { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !lead) {
      return NextResponse.json({ error: 'Not Found', message: 'Lead record not found' }, { status: 404 });
    }

    // 4. Fetch associated Company context
    let company: any = null;
    if (lead.companyId) {
      const { data: assocCompany } = await supabase
        .from('companies')
        .select('*')
        .eq('id', lead.companyId)
        .single();
      company = assocCompany;
    }

    // 5. Validate sufficient data
    if (!lead.name || !lead.title) {
      return NextResponse.json(
        { error: 'Unprocessable Entity', message: 'Lead record has insufficient data (missing name or title)' },
        { status: 422 }
      );
    }

    try {
      // 6. Run AI analyzer flow
      const leadAnalysisResult = await analyzeLead(lead, company);

      // 7. Update database
      const { data: updatedLead, error: updateError } = await supabase
        .from('leads')
        .update({
          enrichment: leadAnalysisResult.enrichment,
          persona: leadAnalysisResult.persona,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('Update lead enrichment failed:', updateError);
        return NextResponse.json({ error: 'Internal Server Error', message: 'Failed to save lead enrichment' }, { status: 500 });
      }

      return NextResponse.json({ updated: updatedLead });
    } catch (flowError: any) {
      console.error('Lead analyzer flow failed:', flowError);
      return NextResponse.json({ error: 'Internal Server Error', message: flowError.message }, { status: 500 });
    }
  }
}
