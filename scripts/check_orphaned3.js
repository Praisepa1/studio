require('dotenv').config({ path: '.env' });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
async function fetchAll(table, select) {
  const res = await fetch(`${url}/rest/v1/${table}?select=${select}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  return await res.json();
}
async function main() {
  const leads = await fetchAll('leads', 'id,user_id');
  const proposals = await fetchAll('proposals', 'id,user_id');
  const contacts = await fetchAll('contacts', 'id,user_id');
  
  let orphanedLeads = 0;
  (leads || []).forEach(l => { if (!l.user_id) orphanedLeads++; });
  
  let orphanedProposals = 0;
  (proposals || []).forEach(p => { if (!p.user_id) orphanedProposals++; });
  
  let orphanedContacts = 0;
  (contacts || []).forEach(c => { if (!c.user_id) orphanedContacts++; });
  
  console.log('Total leads:', leads?.length, '| Orphaned:', orphanedLeads);
  console.log('Total proposals:', proposals?.length, '| Orphaned:', orphanedProposals);
  console.log('Total contacts:', contacts?.length, '| Orphaned:', orphanedContacts);
}
main().catch(console.error);
