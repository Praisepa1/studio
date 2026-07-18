import { createClient } from '@supabase/supabase-js';
import { generateWithProvider, DEFAULT_AI_PROVIDER } from '../src/ai/providers/index';
import { proposalPrompts } from '../src/ai/prompts/index';
import * as dotenv from 'dotenv';
import fs from 'fs';

let envFile = '';
try { envFile = fs.readFileSync('.env', 'utf8'); } catch(e) {}
try { envFile += '\n' + fs.readFileSync('.env.local', 'utf8'); } catch(e) {}

const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || (urlMatch ? urlMatch[1].trim().replace(/^"|"$/g, '') : '');
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || (keyMatch ? keyMatch[1].trim().replace(/^"|"$/g, '') : '');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing Supabase credentials in environment");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const MAX_PER_RUN = 20;
const CONCURRENCY = 3;

async function processLead(lead: any): Promise<'processed' | 'skipped' | 'failed'> {
  try {
    // Dedup check: Check if proposal already exists
    const { data: existingProp } = await supabase
      .from('proposals')
      .select('id')
      .eq('enrichment->>lead_id', lead.id)
      .maybeSingle();
      
    if (existingProp) {
      console.log(`[SKIP] Lead "${lead.name}" already has a proposal.`);
      return 'skipped';
    }
    
    // Deliberate error injection for testing error isolation if lead name is "FAIL_TEST"
    if (lead.name === 'FAIL_TEST') {
      throw new Error("Simulated failure for error isolation test.");
    }
    
    console.log(`[PROCESS] Auto-generating proposal for "${lead.name}"...`);
    const promptFn = proposalPrompts.premium;
    
    let companyName = '';
    if (lead.company_id) {
      const { data: comp } = await supabase.from('companies').select('name').eq('id', lead.company_id).maybeSingle();
      if (comp) companyName = comp.name;
    }
    
    const hasPainPoints = lead.enrichment?.likelyPainPoints && lead.enrichment.likelyPainPoints.length > 0;
    const fallbackPainPoints = lead.enrichment?.businessNeedIndicators && lead.enrichment.businessNeedIndicators.length > 0 
      ? lead.enrichment.businessNeedIndicators 
      : null;
      
    if (!hasPainPoints && !fallbackPainPoints) {
      console.warn(`[WARN] Lead "${lead.name}" lacks pain points; falling back to generic bio.`);
    }
    
    const painPointsArray = hasPainPoints ? lead.enrichment.likelyPainPoints : fallbackPainPoints;

    const ctx = {
      jobTitle: `Outreach to ${lead.name}${companyName ? ` (${lead.title} at ${companyName})` : ` (${lead.title})`}`,
      jobDescription: painPointsArray ? painPointsArray.join(', ') : (lead.bio || 'General outreach'),
      skills: 'B2B, Consulting, Solutions',
      clientTone: 'professional',
      painPoints: painPointsArray ? painPointsArray.join(', ') : 'unknown',
      userSkills: 'expert solutions provider',
      budget: 'not specified'
    };
    
    const prompt = promptFn(ctx);
    const genResult = await generateWithProvider(DEFAULT_AI_PROVIDER, prompt, { maxTokens: 1024, temperature: 0.7 });
    
    const { error: propErr } = await supabase.from('proposals').insert({
      job_id: null,
      job_title: ctx.jobTitle,
      content: genResult.content,
      style: 'premium',
      provider: DEFAULT_AI_PROVIDER,
      model: genResult.model,
      outcome: 'pending',
      gemini_draft: genResult.geminiDraft,
      claude_refinement: genResult.claudeRefinement,
      enrichment: { lead_id: lead.id }
    });
    
    if (propErr) {
      console.error(`[ERROR] DB save failed for "${lead.name}":`, propErr.message);
      await supabase.from('leads').update({ status: 'proposal_failed' }).eq('id', lead.id);
      return 'failed';
    } else {
      console.log(`[SUCCESS] Saved auto-proposal for "${lead.name}"`);
      await supabase.from('leads').update({ status: 'proposal_generated' }).eq('id', lead.id);
      return 'processed';
    }
  } catch (err: any) {
    console.error(`[ERROR] Processing failed for "${lead.name}":`, err.message);
    await supabase.from('leads').update({ status: 'proposal_failed' }).eq('id', lead.id);
    return 'failed';
  }
}

async function run() {
  console.log("=== BATCH RUNNER: PROPOSAL GENERATION ===");
  console.log(`Config: Max ${MAX_PER_RUN} leads/run, ${CONCURRENCY} concurrent.`);
  
  const { data: leads, error: leadsErr } = await supabase
    .from('leads')
    .select('*')
    .eq('status', 'new')
    .limit(MAX_PER_RUN);
    
  if (leadsErr) {
    console.error("Failed to fetch leads:", leadsErr);
    return;
  }
  
  if (!leads || leads.length === 0) {
    console.log("No new leads to process.");
    return;
  }
  
  console.log(`Found ${leads.length} new leads to process.`);
  
  let processed = 0;
  let skipped = 0;
  let failed = 0;
  
  // Concurrency Implementation
  let index = 0;
  async function worker() {
    while (index < leads!.length) {
      const currentLead = leads![index++];
      const result = await processLead(currentLead);
      if (result === 'processed') processed++;
      if (result === 'skipped') skipped++;
      if (result === 'failed') failed++;
    }
  }

  const workers = [];
  for (let i = 0; i < Math.min(CONCURRENCY, leads.length); i++) {
    workers.push(worker());
  }

  await Promise.all(workers);
  
  console.log(`\n=== BATCH COMPLETE ===`);
  console.log(`Processed: ${processed}, Skipped: ${skipped}, Failed: ${failed}`);
}

run();
