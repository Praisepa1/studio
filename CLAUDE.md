# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Note on this file**: This repository contains both a B2B multi-target discovery platform (JobJet)
> AND a suite of AI productivity tools (resume generator, cover letter generator, AI studio, smart search).
> The AI tools are part of the active platform and run alongside the discovery pipelines.
> Some details below (exact env var names, deployment target) are inferred from working
> sessions rather than a fresh read of the repo — correct anything that's drifted.

## Commands

```bash
# Development
npm run dev              # Start Next.js dev server
npm run worker:pipeline  # Start the pipeline orchestration worker (src/workers/pipeline-worker.ts)
npm run worker:crawler   # Start the Playwright crawler worker (src/workers/crawler-worker.ts)

# Build & Quality
npm run build        # Production build
npm run lint          # ESLint
npm run typecheck    # TypeScript type check (tsc --noEmit)
```

Both worker processes must be running (alongside `npm run dev`) for a discovery run to actually
search, crawl, and persist results — the Next.js app only enqueues jobs, it doesn't execute the
pipeline itself.

## Architecture

**JobJet** is a multi-target B2B discovery platform: users search for one of five target types
(Company, Job, SMB, Individual, RFP) and the system searches, crawls, classifies, scores, and
enriches results before persisting them to Supabase.

### Pipeline model

Discovery is a durable, queue-based job, not a request/response cycle:

1. The frontend posts a search to the discovery API and receives a `run_id` immediately — the HTTP
   request does not stay open for the duration of the run.
2. **BullMQ workers** (backed by Redis) execute the pipeline stages: `searching → classifying →
   crawling → extracting → scoring → enriching → storing`. Crawling runs as its own worker
   (`crawler-worker.ts`, Playwright-based) so browser workloads don't compete with AI-bound stages
   for CPU.
3. Progress is broadcast over a **Supabase Realtime** channel (`pipeline:{run_id}`, event
   `pipeline_progress`) using a generalized event contract shared by every target type:
   `{ stage, progress, message, target, results, total_found, total_scored, error }`. `target` and
   `results` replaced an earlier hardcoded `companies` field — every pipeline emits the same shape.
4. Each stage writes a checkpoint row to `pipeline_stage_events` (keyed by `run_id`, with a `target`
   column), so a failed stage can be diagnosed or retried without rerunning the whole pipeline.

### Discovery targets

A Discovery Router dispatches each run to a target-specific pipeline. Status as of the last working
session:

| Target | Pipeline status | Storage table | Notes |
|---|---|---|---|
| Company | Original/baseline pipeline | `companies` | Crawls company websites directly |
| SMB | Built and verified | `smbs` | Local business / directory search, distinct from company crawl logic |
| Job | In design (Phase 2) | `job_postings` (new) vs. `jobs` (existing) | See distinction below |
| Individual | Not started | `individuals` (planned) | LinkedIn/GitHub/portfolio search |
| RFP | Not started | `rfps` (planned) | Procurement portal / tender search |

**Important distinction between `jobs` and `job_postings`**: `public.jobs` is a lightweight hiring
*signal* — a job listing found incidentally while crawling a company's own site, tied to that
company via `company_id`. `public.job_postings` (planned) is a first-class, independently searched
job posting — richer fields (salary, remote policy, ATS platform), a nullable `company_id` with a
`company_name` text fallback for postings not yet matched to a company record. Do not conflate the
two or write Job-pipeline fields onto `public.jobs`.

### Data layer (Supabase / Postgres)

Core tables: `pipeline_runs`, `pipeline_stage_events`, `companies`, `contacts`, `jobs`, `signals`,
`smbs`, and (planned) `job_postings`, `individuals`, `rfps`.

- Redis is a **cache only** (URL/domain dedup) in front of Supabase — never a source of truth.
- Storage writes use `upsert` with a unique key (e.g. `domain` for `smbs`) rather than plain insert,
  so reruns update existing rows instead of duplicating.
- RLS is enabled on all tables with permissive `USING (true)` policies — fine for solo development,
  but scoped to `auth.uid()` before this is exposed beyond local/trusted use.
- `updated_at` triggers keep timestamps current on update (added after an initial gap where several
  tables didn't have one).

### Frontend

- `/discovery` — the active search UI (`src/app/(platform)/discovery/page.tsx`), a client component
  that submits a search, gets a `run_id`, and subscribes to that run's Realtime channel. Renders
  results via `CompanyCard`/`CompanyDrawer` (target-aware card/drawer components are being added
  per target as each pipeline is built — `SmbCard`/`SmbDrawer` exist; `JobCard`, `IndividualCard`,
  `RFPCard` and their drawers do not yet).
- `/companies`, `/jobs`, `/smbs` — persisted-table views (Server Components), querying Supabase
  directly rather than the live pipeline. These should read only columns that exist on their
  respective tables — `/jobs` in particular must not assume `job_postings`-only fields (like
  `posted_at`, full `description`) exist on `public.jobs`.
- Long result lists use `@tanstack/react-virtual` for virtualization.
- `src/components/app-shell.tsx` — sidebar nav shell wrapping platform pages.

### Auth

Route-level guard via `getAuthSession()` (`src/lib/auth`) — implementation not confirmed in this
file; verify against the actual module rather than assuming it's Supabase Auth.

### Search providers

`SearchManager` (`src/core/search/`) wraps individual providers (e.g. Google Custom Search, in
`src/core/search/google.ts`) with retry logic (`withRetry`, `src/core/search/utils.ts`). The Google
provider has intermittently returned `403 Forbidden` — the pipeline is designed to tolerate a single
provider failure and continue, but a persistent 403 needs its own investigation (API key/quota/
referrer restriction), separate from pipeline logic.

### Known in-flight work

- Job pipeline (`job_postings` table + `job.ts` worker) is in design: ATS-footprint search strategy
  (`site:jobs.lever.co OR site:boards.greenhouse.io`-style targeting), fuzzy `company_name` →
  `company_id` backfill on match.
- Individual and RFP pipelines are not yet started.
- `/jobs` page currently needs to be pointed at `public.jobs` (signal table) only, until the Job
  pipeline and `job_postings` table exist — do not add `job_postings`-only fields to `public.jobs`.

### Important config notes

- Path alias `@/*` maps to `./src/*`.
- Deployment target and exact environment variable names were not reconfirmed in this file — check
  `.env`/`.env.local` and any hosting config directly rather than assuming Firebase App Hosting,
  which applied to the previous version of this app.