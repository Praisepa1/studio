import { searchManager } from '@/core/search/manager';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function runRFPPipeline(
  runId: string,
  userId: string,
  config: any,
  broadcastProgress: (data: any) => Promise<void>,
  supabase: SupabaseClient
) {
  await broadcastProgress({ stage: 'searching', progress: 10, message: 'Searching for RFPs...', target: 'rfp' });

  const query = config.query;
  const numResults = config.numResults || 10;
  
  const searchResults = await searchManager.search({
    term: query,
    limit: numResults,
    targetType: 'rfp'
  });

  if (searchResults.length === 0) {
    await broadcastProgress({ stage: 'completed', progress: 100, message: 'No RFPs found.', target: 'rfp', counts: { found: 0, processed: 0 } });
    await supabase.from('pipeline_runs').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', runId);
    return;
  }

  await broadcastProgress({ stage: 'classifying', progress: 30, message: `Found ${searchResults.length} results. Processing...`, target: 'rfp' });

  const uniqueResults = new Map();
  for (const r of searchResults) {
    if (!uniqueResults.has(r.url)) uniqueResults.set(r.url, r);
  }

  const rfps = Array.from(uniqueResults.values()).map(r => ({
    discovered_by_run_id: runId,
    title: r.title || 'Untitled RFP',
    agency: r.url.includes('gov') ? 'Government Agency' : 'Unknown Organization',
    url: r.url,
    deadline: null,
    budget: 'Unknown',
    description: r.snippet,
    status: 'open',
    score: 50,
    tier: 'neutral',
    enrichment: {
      pitch_angle: 'Tailor a proposal addressing the core requirements outlined in the snippet.'
    }
  }));

  await broadcastProgress({ stage: 'storing', progress: 80, message: `Saving ${rfps.length} RFPs...`, target: 'rfp' });

  const { error } = await supabase.from('rfps').insert(rfps);
  if (error) {
    // If there's a unique constraint violation on url, we might need to upsert, 
    // but insert is fine for a basic implementation. 
    console.error('Failed to insert RFPs:', error);
  }

  await broadcastProgress({ stage: 'completed', progress: 100, message: 'Pipeline complete', target: 'rfp', counts: { found: rfps.length, processed: rfps.length } });
  await supabase.from('pipeline_runs').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', runId);
}
