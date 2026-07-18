import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { exportToCsv } from '@/crm/export';

export const dynamic = 'force-dynamic';


/**
 * GET handler for exporting database records (companies/leads) to CSV format.
 * Matches parameters expected by CrmClient:
 * - type: "companies" | "leads"
 * - ids: comma-separated list of IDs to export
 * - all: if "true", all records of that type are exported
 */
export async function GET(request: Request) {
  // 1. Auth Guard using secure getUser check
  const session = await getAuthSession();
  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. Parse Query Params
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'companies';
  const idsParam = searchParams.get('ids');
  const allParam = searchParams.get('all') === 'true';

  try {
    const supabase = await createClient();
    let csvString = '';
    let filename = '';

    if (type === 'companies' || type === 'company') {
      filename = 'companies.csv';
      let query = supabase.from('companies').select('*');
      
      if (!allParam && idsParam) {
        const ids = idsParam.split(',');
        query = query.in('id', ids);
      }
      
      const { data: companies, error } = await query.order('score', { ascending: false });
      if (error) throw error;

      // Map properties to camelCase for the exportToCsv serializer
      const mapped = (companies || []).map((c: any) => ({
        name: c.name,
        website: c.domain,
        industry: c.industry,
        location: c.location,
        score: c.score,
        tier: c.tier,
        hiringStatus: c.hiring_status,
        pitch_angle: c.enrichment?.pitch_angle || '',
        source: 'discovery',
        lastScrapedAt: c.updated_at,
      }));

      const csvResult = exportToCsv({ records: mapped, type: 'company' });
      csvString = csvResult.csv_string;
    } else {
      filename = 'leads.csv';
      let query = supabase.from('leads').select('*, companies(name)');
      
      if (!allParam && idsParam) {
        const ids = idsParam.split(',');
        query = query.in('id', ids);
      }
      
      const { data: leads, error } = await query.order('outreach_score', { ascending: false });
      if (error) throw error;

      // Map properties to camelCase for the exportToCsv serializer
      const mapped = (leads || []).map((l: any) => ({
        name: l.name,
        company: l.companies?.name || 'Unknown Company',
        email: l.email,
        phone: l.phone,
        platform: l.source,
        outreachScore: l.outreach_score,
        status: l.status,
        source: l.source,
        persona: l.persona,
      }));

      const csvResult = exportToCsv({ records: mapped, type: 'lead' });
      csvString = csvResult.csv_string;
    }

    return new Response(csvString, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error('Failed to export records:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
