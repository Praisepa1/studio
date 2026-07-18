import { searchManager } from '@/core/search/manager';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function runIndividualPipeline(
  runId: string,
  userId: string,
  config: any,
  broadcastProgress: (data: any) => Promise<void>,
  supabase: SupabaseClient
) {
  await broadcastProgress({ stage: 'searching', progress: 10, message: 'Searching for individuals...', target: 'individual' });

  const query = config.query;
  const numResults = config.numResults || 10;
  
  const searchResults = await searchManager.search({
    term: query,
    limit: numResults,
    targetType: 'individual'
  });

  if (searchResults.length === 0) {
    await broadcastProgress({ stage: 'completed', progress: 100, message: 'No individuals found.', target: 'individual', counts: { found: 0, processed: 0 } });
    await supabase.from('pipeline_runs').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', runId);
    return;
  }

  await broadcastProgress({ stage: 'classifying', progress: 30, message: `Found ${searchResults.length} results. Processing...`, target: 'individual' });

  const uniqueResults = new Map();
  for (const r of searchResults) {
    if (!uniqueResults.has(r.url)) uniqueResults.set(r.url, r);
  }

  const individuals = Array.from(uniqueResults.values()).map(r => ({
    discovered_by_run_id: runId,
    name: r.title ? r.title.replace(/\|.*/, '').trim() : 'Unknown',
    current_role: '',
    company_name: '',
    linkedin_url: r.url.includes('linkedin.com') ? r.url : null,
    github_url: r.url.includes('github.com') ? r.url : null,
    portfolio_url: r.url,
    skills: [],
    location: '',
    email: '',
    score: 50,
    tier: 'neutral',
    enrichment: {
      description: r.snippet,
      pitch_angle: 'Explore potential synergies based on their background.'
    }
  }));

  await broadcastProgress({ stage: 'storing', progress: 80, message: `Saving ${individuals.length} individuals...`, target: 'individual' });

  const { error } = await supabase.from('individuals').insert(individuals);
  if (error) {
    console.error('Failed to insert individuals:', error);
    throw error;
  }

  await broadcastProgress({ stage: 'completed', progress: 100, message: 'Pipeline complete', target: 'individual', counts: { found: individuals.length, processed: individuals.length } });
  await supabase.from('pipeline_runs').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', runId);
}
