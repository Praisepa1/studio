-- ============================================================
-- JobJet — Canonical Schema (Reset)
-- Supersedes: schema.sql, 20260712_discovery_targets.sql,
--             20260713_smb_schema_fixes.sql, 20260715_smb_drift_reconcile.sql,
--             and the ad-hoc pipeline_runs/pipeline_stage_events/contacts/jobs/signals rebuild.
--
-- This is a DESTRUCTIVE reset. Read the header block before running.
-- ============================================================

-- ------------------------------------------------------------
-- STEP 0 — BACKUP FIRST (do this outside this file, before running it)
--   Supabase Dashboard → Database → Backups → trigger a manual backup,
--   OR: pg_dump the project via the connection string, OR at minimum:
--     select * from companies;  select * from leads;  select * from jobs;
--     select * from proposals;  select * from smbs;
--   ...and export any rows you actually care about. Once this script runs,
--   they are gone. Do not skip this even if you believe tables are empty —
--   confirm row counts first (see verification script below), don't assume.
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- STEP 1 — Drop everything, in dependency order
-- ------------------------------------------------------------
DROP TABLE IF EXISTS public.proposals CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.pipeline_stage_events CASCADE;
DROP TABLE IF EXISTS public.contacts CASCADE;
DROP TABLE IF EXISTS public.signals CASCADE;
DROP TABLE IF EXISTS public.jobs CASCADE;
DROP TABLE IF EXISTS public.job_postings CASCADE;
DROP TABLE IF EXISTS public.individuals CASCADE;
DROP TABLE IF EXISTS public.rfps CASCADE;
DROP TABLE IF EXISTS public.smbs CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;
DROP TABLE IF EXISTS public.pipeline_runs CASCADE;

DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;

-- ------------------------------------------------------------
-- STEP 2 — Shared trigger function (create once, reuse everywhere)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- STEP 3 — pipeline_runs (parent of all pipeline activity)
-- ------------------------------------------------------------
CREATE TABLE public.pipeline_runs (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL,
    target         TEXT NOT NULL,              -- 'company' | 'smb' | 'job' | 'individual' | 'rfp'
    config         JSONB NOT NULL DEFAULT '{}'::jsonb,
    status         TEXT NOT NULL DEFAULT 'running',  -- 'running' | 'completed' | 'failed'
    summary_counts JSONB DEFAULT '{}'::jsonb,
    costs          JSONB DEFAULT '{}'::jsonb,
    error          TEXT,
    started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at   TIMESTAMPTZ
);
CREATE INDEX idx_pipeline_runs_target ON public.pipeline_runs(target);
CREATE INDEX idx_pipeline_runs_status ON public.pipeline_runs(status);

-- ------------------------------------------------------------
-- STEP 4 — companies (canonical target entity)
-- ------------------------------------------------------------
CREATE TABLE public.companies (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discovered_by_run_id UUID REFERENCES public.pipeline_runs(id) ON DELETE SET NULL,
    name                 TEXT NOT NULL,
    domain               TEXT NOT NULL,
    industry             TEXT,
    location             TEXT,
    size                 TEXT,
    score                INTEGER DEFAULT 0,
    tier                 TEXT,
    is_actively_hiring   BOOLEAN DEFAULT false,
    hiring_status        TEXT DEFAULT 'none',
    tech_stack           JSONB DEFAULT '[]'::jsonb,
    social_links         JSONB DEFAULT '[]'::jsonb,
    contact_email        TEXT,
    contact_phone        TEXT,
    enrichment           JSONB DEFAULT '{}'::jsonb,  -- description and other soft fields live here
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT companies_domain_unique UNIQUE (domain)
);
CREATE INDEX idx_companies_domain ON public.companies(domain);
CREATE INDEX idx_companies_run_id ON public.companies(discovered_by_run_id);
CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- STEP 5 — smbs (same shape discipline as companies)
-- ------------------------------------------------------------
CREATE TABLE public.smbs (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discovered_by_run_id UUID REFERENCES public.pipeline_runs(id) ON DELETE SET NULL,
    name                 TEXT NOT NULL,
    domain               TEXT NOT NULL,
    industry             TEXT,
    location             TEXT,
    business_type        TEXT,
    rating               REAL,
    address              TEXT,
    phone                TEXT,
    score                INTEGER DEFAULT 0,
    tier                 TEXT,
    is_actively_hiring   BOOLEAN DEFAULT false,
    tech_stack           JSONB DEFAULT '[]'::jsonb,
    social_links         JSONB DEFAULT '[]'::jsonb,
    contact_email        TEXT,
    enrichment           JSONB DEFAULT '{}'::jsonb,  -- description lives here, not as a column
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT smbs_domain_unique UNIQUE (domain)
);
CREATE INDEX idx_smbs_domain ON public.smbs(domain);
CREATE INDEX idx_smbs_run_id ON public.smbs(discovered_by_run_id);
CREATE TRIGGER trg_smbs_updated_at BEFORE UPDATE ON public.smbs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- STEP 6 — job_postings (standalone Job-target discovery results)
-- ------------------------------------------------------------
CREATE TABLE public.job_postings (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discovered_by_run_id UUID REFERENCES public.pipeline_runs(id) ON DELETE SET NULL,
    title                TEXT NOT NULL,
    company_id           UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    company_name         TEXT NOT NULL,
    url                  TEXT NOT NULL,
    location             TEXT,
    department           TEXT,
    salary_range         TEXT,
    required_skills      JSONB DEFAULT '[]'::jsonb,
    remote_policy        TEXT,
    seniority_level      TEXT,
    ats_platform         TEXT,
    description          TEXT,
    score                INTEGER DEFAULT 0,
    tier                 TEXT,
    enrichment           JSONB DEFAULT '{}'::jsonb,
    posted_at            TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT job_postings_url_unique UNIQUE (url)
);
CREATE INDEX idx_job_postings_company_id ON public.job_postings(company_id);
CREATE INDEX idx_job_postings_run_id ON public.job_postings(discovered_by_run_id);
CREATE TRIGGER trg_job_postings_updated_at BEFORE UPDATE ON public.job_postings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- STEP 7 — individuals
-- ------------------------------------------------------------
CREATE TABLE public.individuals (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discovered_by_run_id UUID REFERENCES public.pipeline_runs(id) ON DELETE SET NULL,
    name                 TEXT NOT NULL,
    "current_role"       TEXT,
    company_name         TEXT,
    linkedin_url         TEXT,
    github_url           TEXT,
    portfolio_url        TEXT,
    skills               JSONB DEFAULT '[]'::jsonb,
    location             TEXT,
    email                TEXT,
    score                INTEGER DEFAULT 0,
    tier                 TEXT,
    enrichment           JSONB DEFAULT '{}'::jsonb,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_individuals_run_id ON public.individuals(discovered_by_run_id);
CREATE TRIGGER trg_individuals_updated_at BEFORE UPDATE ON public.individuals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- STEP 8 — rfps
-- ------------------------------------------------------------
CREATE TABLE public.rfps (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discovered_by_run_id UUID REFERENCES public.pipeline_runs(id) ON DELETE SET NULL,
    title                TEXT NOT NULL,
    agency               TEXT,
    url                  TEXT NOT NULL,
    deadline             TIMESTAMPTZ,
    budget               TEXT,
    description          TEXT,
    status               TEXT,
    score                INTEGER DEFAULT 0,
    tier                 TEXT,
    enrichment           JSONB DEFAULT '{}'::jsonb,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT rfps_url_unique UNIQUE (url)
);
CREATE INDEX idx_rfps_run_id ON public.rfps(discovered_by_run_id);
CREATE TRIGGER trg_rfps_updated_at BEFORE UPDATE ON public.rfps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- STEP 9 — contacts (per-company, distinct from individuals-as-target)
-- ------------------------------------------------------------
CREATE TABLE public.contacts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    type        TEXT NOT NULL,   -- 'email' | 'phone' | 'named' | 'address'
    value       TEXT NOT NULL,
    name        TEXT,
    title       TEXT,
    context     TEXT,
    source_url  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_contacts_company_id ON public.contacts(company_id);

-- ------------------------------------------------------------
-- STEP 10 — jobs (lightweight hiring SIGNAL, not a full posting — kept
--            distinct from job_postings per the Phase-2 design decision)
-- ------------------------------------------------------------
CREATE TABLE public.jobs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id   UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    department   TEXT,
    location     TEXT,
    url          TEXT,
    ats_platform TEXT,
    posted_at    TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_jobs_company_id ON public.jobs(company_id);

-- ------------------------------------------------------------
-- STEP 11 — signals
-- ------------------------------------------------------------
CREATE TABLE public.signals (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    type        TEXT NOT NULL,   -- 'hiring' | 'buying' | 'tech'
    signal_name TEXT NOT NULL,
    strength    TEXT,
    details     JSONB DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_signals_company_id ON public.signals(company_id);

-- ------------------------------------------------------------
-- STEP 11.1 — leads
-- ------------------------------------------------------------
CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
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
    enrichment JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_leads_company_id ON public.leads(company_id);
CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- STEP 11.2 — proposals
-- ------------------------------------------------------------
CREATE TABLE public.proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    job_title TEXT,
    content TEXT NOT NULL,
    style TEXT,
    provider TEXT,
    model TEXT,
    outcome TEXT DEFAULT 'pending',
    feedback TEXT,
    edited_content TEXT,
    gemini_draft TEXT,
    claude_refinement TEXT,
    enrichment JSONB DEFAULT '{}'::jsonb,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_proposals_job_id ON public.proposals(job_id);
CREATE TRIGGER trg_proposals_updated_at BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- STEP 12 — pipeline_stage_events (generalized target contract)
-- ------------------------------------------------------------
CREATE TABLE public.pipeline_stage_events (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id       UUID NOT NULL REFERENCES public.pipeline_runs(id) ON DELETE CASCADE,
    target       TEXT NOT NULL,   -- 'company' | 'smb' | 'job' | 'individual' | 'rfp'
    entity_id    UUID,            -- points at companies/smbs/job_postings/etc depending on target; app-level FK, not DB-enforced (polymorphic)
    stage        TEXT NOT NULL,   -- 'searching' | 'classifying' | 'crawling' | 'extracting' | 'scoring' | 'enriching' | 'storing'
    status       TEXT NOT NULL DEFAULT 'started',  -- 'started' | 'progress' | 'completed' | 'failed'
    percent      SMALLINT DEFAULT 0,
    message      TEXT,
    counts       JSONB DEFAULT '{}'::jsonb,   -- { found, processed, remaining }
    started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    error        TEXT
);
CREATE INDEX idx_pipeline_stage_events_run_id ON public.pipeline_stage_events(run_id);
CREATE INDEX idx_pipeline_stage_events_target ON public.pipeline_stage_events(target);

-- ------------------------------------------------------------
-- STEP 13 — RLS: one policy set, applied identically to every table.
--            (Same permissive USING(true) pattern already in use —
--            carried forward as-is, not tightened, since that's a
--            separate decision from the schema reset.)
-- ------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'pipeline_runs','pipeline_stage_events','companies','smbs',
    'job_postings','individuals','rfps','contacts','jobs','signals',
    'leads','proposals'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "Allow public read access" ON public.%I FOR SELECT USING (true)', t);
    EXECUTE format('CREATE POLICY "Allow public insert access" ON public.%I FOR INSERT WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "Allow public update access" ON public.%I FOR UPDATE USING (true)', t);
    EXECUTE format('CREATE POLICY "Allow public delete access" ON public.%I FOR DELETE USING (true)', t);
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- STEP 14 — Refresh PostgREST schema cache
-- ------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
