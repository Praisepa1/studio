import { getAuthSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { exportToCsv } from '@/crm/export';

/**
 * GET handler specifically matching the Companies list page direct download link.
 * Exports all discovered companies to companies.csv format.
 */
export async function GET() {
  const session = await getAuthSession();
  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const supabase = await createClient();
    const { data: companies, error } = await supabase
      .from('companies')
      .select('*')
      .order('score', { ascending: false });

    if (error) throw error;

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

    return new Response(csvResult.csv_string, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="companies.csv"',
      },
    });
  } catch (err: any) {
    console.error('Failed to export companies:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
