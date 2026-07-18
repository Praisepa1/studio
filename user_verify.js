const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const url = urlMatch ? urlMatch[1].trim() : '';
// NOTE: I am stripping quotes out of the key because that broke it previously!
let key = keyMatch ? keyMatch[1].trim() : '';
if (key.startsWith('"')) key = key.slice(1);
if (key.endsWith('"')) key = key.slice(0, -1);

async function run() {
  try {
    const res = await fetch(`${url}/rest/v1/?apikey=${key}`);
    const swagger = await res.json();

    console.log("=== SCHEMA VERIFICATION ===");
    const leadsProps = swagger.definitions?.leads?.properties || {};
    console.log(`leads columns (${Object.keys(leadsProps).length}):`, Object.keys(leadsProps).join(', '));

    const proposalsProps = swagger.definitions?.proposals?.properties || {};
    console.log(`proposals columns (${Object.keys(proposalsProps).length}):`, Object.keys(proposalsProps).join(', '));

    const supabase = createClient(url, key);
    console.log("\n=== LEADS ROWS ===");
    const { data: leads, error: leadsErr } = await supabase.from('leads').select('*').limit(10);
    if (leadsErr) {
      console.error(leadsErr);
    } else {
      console.log(`Found ${leads.length} leads.`);
      leads.forEach(l => {
        console.log(`ID: ${l.id} | Name: ${l.name} | Title: ${l.title} | Email: ${l.email} | Company ID: ${l.company_id} | Status: ${l.status} | Created: ${l.created_at}`);
      });
    }

    console.log("\n=== PROPOSALS ROWS ===");
    const { data: props, error: propsErr } = await supabase.from('proposals').select('*').limit(10);
    if (propsErr) {
      console.error(propsErr);
    } else {
      console.log(`Found ${props.length} proposals.`);
    }

  } catch (e) {
    console.error(e);
  }
}

run();
