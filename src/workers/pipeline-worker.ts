import 'dotenv/config';
import { Worker, Job } from "bullmq";
import { redis } from "@/lib/redis";
import { createWorkerClient } from "@/lib/supabase/worker";
import { runCompanyPipeline } from './pipelines/company';
import { runSMBPipeline } from './pipelines/smb';
import { runJobPipeline } from './pipelines/job';
import { runIndividualPipeline } from './pipelines/individual';
import { runRFPPipeline } from './pipelines/rfp';

export const pipelineWorker = new Worker("pipeline-queue", async (job: Job) => {
  console.log(`Processing job ${job.id} for target ${job.data.config?.target}`);
  const { runId, userId, config } = job.data;
  const { target } = config;
  const supabase = createWorkerClient();

  const broadcastProgress = async (data: any) => {
    const payload = { ...data, run_id: runId, timestamp: new Date().toISOString() };
    
    // 1. Broadcast to Supabase Realtime
    supabase.channel(`pipeline:${runId}`).send({
      type: 'broadcast',
      event: 'pipeline_progress',
      payload: payload
    });

    // 2. Insert into DB for history
    if (runId && data.stage) {
      try {
        await supabase.from('pipeline_stage_events').insert({
          run_id: runId,
          stage: data.stage,
          status: data.error ? 'failed' : (data.progress === 100 ? 'completed' : 'progress'),
          percent: data.progress || 0,
          message: data.message || '',
          counts: data.counts || { found: data.total_found, processed: data.total_scored },
          target: data.target || null,
          error: data.error || null
        });
      } catch (e) {
        console.error("Failed to insert pipeline_stage_events", e);
      }
    }
  };


  try {
    if (target === 'company') {
      await runCompanyPipeline(runId, userId, config, broadcastProgress, supabase);
    } else if (target === 'smb') {
      await runSMBPipeline(runId, userId, config, broadcastProgress, supabase);
    } else if (target === 'job') {
      await runJobPipeline(runId, userId, config, broadcastProgress, supabase);
    } else if (target === 'individual') {
      await runIndividualPipeline(runId, userId, config, broadcastProgress, supabase);
    } else if (target === 'rfp') {
      await runRFPPipeline(runId, userId, config, broadcastProgress, supabase);
    } else {
      throw new Error(`Unsupported target type: ${target}`);
    }
  } catch (err: any) {
    console.error('Worker pipeline failed:', err);
    await broadcastProgress({ stage: 'failed', progress: 100, message: `Pipeline failed: ${err.message}`, error: err.message, target, results: [] });
    await supabase.from('pipeline_runs').update({ status: 'failed', completed_at: new Date().toISOString() }).eq('id', runId);
    throw err;
  }
}, { connection: redis as any, lockDuration: 600000 });

pipelineWorker.on('completed', job => console.log(`Pipeline Job ${job.id} has completed!`));
pipelineWorker.on('failed', (job, err) => console.log(`Pipeline Job ${job?.id} has failed with ${err.message}`));
