const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const url = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
let key = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
if (key.startsWith('"')) key = key.slice(1);
if (key.endsWith('"')) key = key.slice(0, -1);

const supabase = createClient(url, key);

async function run() {
  console.log("=== SCHEMA VERIFICATION ===");
  
  // LEADS
  let { data: comps } = await supabase.from('companies').select('id').limit(1);
  let compId = comps?.[0]?.id || null;
  
  if (compId) {
    let dummyLead = {
      company_id: compId,
      name: 'TEST_LEAD_IGNORE',
      title: 'Test',
      status: 'new'
    };
    let { data: inserted, error: errIn } = await supabase.from('leads').insert(dummyLead).select().single();
    if (inserted) {
      console.log(`leads columns (${Object.keys(inserted).length}):`, Object.keys(inserted).join(', '));
      await supabase.from('leads').delete().eq('id', inserted.id);
    } else {
      console.error("Failed to insert lead:", errIn);
    }
  }

  // PROPOSALS
  let { data: jobs } = await supabase.from('jobs').select('id').limit(1);
  let jobId = jobs?.[0]?.id || null;
  
  let dummyProp = {
    job_id: jobId,
    content: 'TEST_PROP_IGNORE'
  };
  let { data: pInserted, error: pErr } = await supabase.from('proposals').insert(dummyProp).select().single();
  if (pInserted) {
    console.log(`proposals columns (${Object.keys(pInserted).length}):`, Object.keys(pInserted).join(', '));
    await supabase.from('proposals').delete().eq('id', pInserted.id);
  } else {
    console.error("Failed to insert proposal:", pErr);
  }

  console.log("\n=== PRE-EXISTING LEADS ROWS ===");
  let { data: leads } = await supabase.from('leads').select('*').limit(10);
  if (leads && leads.length > 0) {
    leads.forEach(l => console.log(`- ID: ${l.id}, Name: ${l.name}, Company: ${l.company_id}, Created: ${l.created_at}`));
  } else {
    console.log('No pre-existing leads found.');
  }
}
run();
