import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { redis } from '../lib/redis';
import { crawlSite, CrawlSiteOptions } from '../core/crawler/site-crawler';

const crawlerQueueName = 'crawler-queue';

console.log(`[Crawler Worker] Starting worker for queue: ${crawlerQueueName}`);
console.log(`[Crawler Worker] Connecting to Redis via shared connection`);

redis.on('error', (err) => {
  console.warn(`[Redis Warning] Connection error (${err.code || err.message}). Transient reconnect, job unaffected.`);
});

redis.on('ready', () => {
  console.log(`[Redis] Connection ready.`);
});

const worker = new Worker(
  crawlerQueueName,
  async (job: Job) => {
    const { url, options } = job.data as { url: string; options?: CrawlSiteOptions };
    console.log(`[Crawler Worker] Processing job ${job.id} for URL: ${url}`);
    
    try {
      const result = await crawlSite(url, options);
      console.log(`[Crawler Worker] Completed job ${job.id} for URL: ${url} - Crawled ${result.meta.pages_crawled} pages`);
      return result;
    } catch (e: any) {
      console.error(`[Crawler Worker] Failed job ${job.id} for URL: ${url}`, e);
      throw e;
    }
  },
  {
    connection: redis as any,
    concurrency: 5, // Process up to 5 crawls concurrently
    lockDuration: 300000, // 5 minutes lock duration for slow crawling jobs
  }
);

worker.on('failed', (job, err) => {
  console.error(`[Crawler Worker] Job ${job?.id} failed with error:`, err);
});

worker.on('error', err => {
  console.error(`[Crawler Worker] Worker connection error (BullMQ will auto-recover):`, err.message || err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[Crawler Worker] Shutting down...');
  await worker.close();
  process.exit(0);
});
