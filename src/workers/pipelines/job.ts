import { runCompanyPipeline } from './company';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function runJobPipeline(
  runId: string,
  userId: string,
  config: any,
  broadcastProgress: (data: any) => Promise<void>,
  supabase: SupabaseClient
) {
  // A Job search is fundamentally searching for companies that have job postings.
  // We use the company pipeline, which natively extracts and saves job listings.
  return runCompanyPipeline(runId, userId, config, broadcastProgress, supabase);
}
