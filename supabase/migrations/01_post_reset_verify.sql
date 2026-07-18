-- Run this AFTER 000_fresh_schema.sql to confirm the reset actually landed
-- (per the standing rule: never trust "ran without error" — check the
-- live schema directly).

select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'pipeline_runs','pipeline_stage_events','companies','smbs',
    'job_postings','individuals','rfps','contacts','jobs','signals'
  )
order by table_name, ordinal_position;

-- Confirm UNIQUE constraints exist where expected
select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid)
from pg_constraint
where contype = 'u'
  and conrelid::regclass::text in ('companies','smbs','job_postings','rfps');

-- Confirm triggers exist
select event_object_table, trigger_name
from information_schema.triggers
where trigger_schema = 'public'
order by event_object_table;

-- Confirm RLS is enabled everywhere
select relname, relrowsecurity
from pg_class
where relname in (
  'pipeline_runs','pipeline_stage_events','companies','smbs',
  'job_postings','individuals','rfps','contacts','jobs','signals'
);
