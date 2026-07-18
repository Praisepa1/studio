require('dotenv').config({ path: '.env' });
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
  const { data: runs, error: e1 } = await supabase.from('pipeline_runs').select('user_id').limit(1);
  if (e1) throw e1;
  
  console.log("Praise's user_id:", runs?.[0]?.user_id);
}

main().catch(console.error);
