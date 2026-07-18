import { Queue, QueueEvents } from 'bullmq';
import { redis } from '../redis';

export const crawlerQueueName = 'crawler-queue';

export const crawlerQueue = new Queue(crawlerQueueName, {
  connection: redis as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: 100, // keep some history
  },
});

export const crawlerQueueEvents = new QueueEvents(crawlerQueueName, { connection: redis as any });
