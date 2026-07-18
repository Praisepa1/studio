-- 1. Add user_id column
ALTER TABLE leads ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id);

-- 2. Backfill contacts from pipeline_runs via companies
UPDATE contacts
SET user_id = pipeline_runs.user_id
FROM companies
JOIN pipeline_runs ON pipeline_runs.id = companies.discovered_by_run_id
WHERE contacts.company_id = companies.id;

-- 3. Backfill orphaned leads and proposals with Praise's user_id
-- We also backfill any contacts that might be orphaned (though there shouldn't be any).
UPDATE leads
SET user_id = '67cc08b9-ebf1-4a1b-a687-1a857013b602'
WHERE user_id IS NULL;

UPDATE proposals
SET user_id = '67cc08b9-ebf1-4a1b-a687-1a857013b602'
WHERE user_id IS NULL;

UPDATE contacts
SET user_id = '67cc08b9-ebf1-4a1b-a687-1a857013b602'
WHERE user_id IS NULL;

-- 4. Enable RLS on these tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- 5. Drop old permissive policies
DROP POLICY IF EXISTS "Allow public read access" ON leads;
DROP POLICY IF EXISTS "Allow public insert access" ON leads;
DROP POLICY IF EXISTS "Allow public update access" ON leads;
DROP POLICY IF EXISTS "Allow public delete access" ON leads;

DROP POLICY IF EXISTS "Allow public read access" ON proposals;
DROP POLICY IF EXISTS "Allow public insert access" ON proposals;
DROP POLICY IF EXISTS "Allow public update access" ON proposals;
DROP POLICY IF EXISTS "Allow public delete access" ON proposals;

DROP POLICY IF EXISTS "Allow public read access" ON contacts;
DROP POLICY IF EXISTS "Allow public insert access" ON contacts;
DROP POLICY IF EXISTS "Allow public update access" ON contacts;
DROP POLICY IF EXISTS "Allow public delete access" ON contacts;

-- 6. Create User isolation policies
CREATE POLICY "User isolation" ON leads FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "User isolation" ON proposals FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "User isolation" ON contacts FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
