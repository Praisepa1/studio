const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });
const adminClient = createClient(url, serviceKey, { auth: { persistSession: false } });

async function runTest() {
  console.log('--- 1. Testing Unauthenticated Access ---');
  let res = await anonClient.from('leads').select('id');
  console.log('Leads (Anon):', res.data?.length || 0, res.error ? 'Error: ' + res.error.message : '');

  console.log('\n--- 2. Creating Temp User ---');
  const tempEmail = 'rls_test_agent_' + Date.now() + '@studio.local';
  const { data: { user }, error: createErr } = await adminClient.auth.admin.createUser({
    email: tempEmail,
    password: 'Password123!',
    email_confirm: true
  });
  if (createErr) throw createErr;
  console.log('Created temp user:', tempEmail, user.id);

  console.log('\n--- 3. Testing Authenticated Access (Different User) ---');
  const { data: { session }, error: signInErr } = await anonClient.auth.signInWithPassword({
    email: tempEmail,
    password: 'Password123!'
  });
  if (signInErr) throw signInErr;
  
  const authClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
    auth: { persistSession: false }
  });

  const leadsAuth = await authClient.from('leads').select('id');
  console.log('Leads visible to temp user:', leadsAuth.data?.length);

  const proposalsAuth = await authClient.from('proposals').select('id');
  console.log('Proposals visible to temp user:', proposalsAuth.data?.length);

  const contactsAuth = await authClient.from('contacts').select('id');
  console.log('Contacts visible to temp user:', contactsAuth.data?.length);

  console.log('\n--- 4. Testing Authenticated Access (Self-Owned Data) ---');
  // Insert dummy data owned by the temp user using the service role key
  const { error: insertLeadErr } = await adminClient.from('leads').insert({
    name: 'RLS Test Lead',
    title: 'Test',
    linkedin_url: 'https://test.local',
    status: 'new',
    user_id: user.id
  });
  if (insertLeadErr) throw insertLeadErr;

  const { error: insertPropErr } = await adminClient.from('proposals').insert({
    job_title: 'RLS Test Job',
    content: 'Test content',
    style: 'formal',
    provider: 'openai',
    model: 'gpt-4o',
    outcome: 'pending',
    user_id: user.id
  });
  if (insertPropErr) throw insertPropErr;

  const { data: randComp } = await anonClient.from('companies').select('id').limit(1).single();
  const validCompanyId = randComp ? randComp.id : null;

  const { error: insertContErr } = await adminClient.from('contacts').insert({
    company_id: validCompanyId,
    type: 'email',
    value: 'rls-test@test.local',
    user_id: user.id
  });
  if (insertContErr) throw insertContErr;
  
  // Query again as the temp user
  const leadsAuthSelf = await authClient.from('leads').select('id, name');
  console.log('Leads visible to temp user after self-insert:', leadsAuthSelf.data?.length, '(Expected: 1)');

  const proposalsAuthSelf = await authClient.from('proposals').select('id');
  console.log('Proposals visible to temp user after self-insert:', proposalsAuthSelf.data?.length, '(Expected: 1)');

  const contactsAuthSelf = await authClient.from('contacts').select('id');
  console.log('Contacts visible to temp user after self-insert:', contactsAuthSelf.data?.length, '(Expected: 1)');

  console.log('\n--- 5. Cleaning up ---');
  // Delete the dummy data
  await adminClient.from('leads').delete().eq('user_id', user.id);
  await adminClient.from('proposals').delete().eq('user_id', user.id);
  await adminClient.from('contacts').delete().eq('user_id', user.id);
  await adminClient.auth.admin.deleteUser(user.id);
  console.log('Deleted temp user and test rows.');
}
runTest().catch(console.error);
