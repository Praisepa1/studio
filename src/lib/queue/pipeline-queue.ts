import { Queue, QueueEvents } from "bullmq";
import { redis } from "../redis";

export const pipelineQueue = new Queue("pipeline-queue", {
  connection: redis as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: 100, // keep the last 100 failures for debugging
  },
});

export const pipelineQueueEvents = new QueueEvents("pipeline-queue", {
  connection: redis as any,
});
