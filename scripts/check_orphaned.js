require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false }
});

async function main() {
  console.log("Fetching pipeline runs...");
  const { data: runs, error: e1 } = await supabase.from('pipeline_runs').select('id, user_id');
  if (e1) throw e1;
  
  console.log("Fetching companies...");
  const { data: companies, error: e2 } = await supabase.from('companies').select('id, discovered_by_run_id');
  if (e2) throw e2;

  console.log("Fetching jobs...");
  const { data: jobs, error: e3 } = await supabase.from('jobs').select('id, company_id');
  if (e3) throw e3;

  console.log("Fetching leads...");
  const { data: leads, error: e4 } = await supabase.from('leads').select('id, company_id');
  if (e4) throw e4;

  console.log("Fetching proposals...");
  const { data: proposals, error: e5 } = await supabase.from('proposals').select('id, job_id');
  if (e5) throw e5;

  console.log("Fetching contacts...");
  const { data: contacts, error: e6 } = await supabase.from('contacts').select('id, company_id');
  if (e6) throw e6;

  console.log("Building maps...");
  const runMap = new Map((runs || []).map(r => [r.id, r.user_id]));
  const companyRunMap = new Map((companies || []).map(c => [c.id, c.discovered_by_run_id]));
  const jobCompanyMap = new Map((jobs || []).map(j => [j.id, j.company_id]));

  let orphanedLeads = 0;
  (leads || []).forEach(l => {
    const runId = companyRunMap.get(l.company_id);
    const userId = runMap.get(runId);
    if (!userId) orphanedLeads++;
  });

  let orphanedProposals = 0;
  (proposals || []).forEach(p => {
    const compId = jobCompanyMap.get(p.job_id);
    const runId = companyRunMap.get(compId);
    const userId = runMap.get(runId);
    if (!userId) orphanedProposals++;
  });

  let orphanedContacts = 0;
  (contacts || []).forEach(c => {
    const runId = companyRunMap.get(c.company_id);
    const userId = runMap.get(runId);
    if (!userId) orphanedContacts++;
  });

  console.log('Total leads:', leads?.length, '| Orphaned:', orphanedLeads);
  console.log('Total proposals:', proposals?.length, '| Orphaned:', orphanedProposals);
  console.log('Total contacts:', contacts?.length, '| Orphaned:', orphanedContacts);
}

main().then(() => console.log('Done')).catch(console.error);
