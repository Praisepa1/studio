-- Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    domain TEXT NOT NULL,
    industry TEXT,
    location TEXT,
    size TEXT,
    description TEXT,
    score INTEGER DEFAULT 0,
    tier TEXT,
    is_actively_hiring BOOLEAN DEFAULT false,
    hiring_status TEXT DEFAULT 'none',
    tech_stack TEXT[] DEFAULT '{}',
    social_links TEXT[] DEFAULT '{}',
    contact_email TEXT,
    contact_phone TEXT,
    enrichment JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create leads table
CREATE TABLE IF NOT EXISTS public.leads (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    linkedin_url TEXT,
    status TEXT DEFAULT 'new',
    source TEXT DEFAULT 'other',
    outreach_score INTEGER DEFAULT 0,
    recent_activity TEXT,
    persona TEXT,
    enrichment JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create jobs table
CREATE TABLE IF NOT EXISTS public.jobs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    requirements TEXT[] DEFAULT '{}',
    url TEXT,
    source TEXT DEFAULT 'other',
    posted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create proposals table
CREATE TABLE IF NOT EXISTS public.proposals (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    job_id TEXT REFERENCES public.jobs(id) ON DELETE CASCADE,
    job_title TEXT,
    content TEXT NOT NULL,
    style TEXT,
    provider TEXT,
    model TEXT,
    outcome TEXT DEFAULT 'pending',
    feedback TEXT,
    gemini_draft TEXT,
    claude_refinement TEXT,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create pipeline_runs table
CREATE TABLE IF NOT EXISTS public.pipeline_runs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID,
    query TEXT,
    status TEXT DEFAULT 'running',
    companies_found INTEGER DEFAULT 0,
    duration_ms INTEGER DEFAULT 0,
    error TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable public read/write access (RLS policies)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON public.companies FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.companies FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.companies FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.companies FOR DELETE USING (true);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON public.leads FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.leads FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.leads FOR DELETE USING (true);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON public.jobs FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.jobs FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.jobs FOR DELETE USING (true);

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON public.proposals FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.proposals FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.proposals FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.proposals FOR DELETE USING (true);

ALTER TABLE public.pipeline_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON public.pipeline_runs FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.pipeline_runs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.pipeline_runs FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.pipeline_runs FOR DELETE USING (true);
