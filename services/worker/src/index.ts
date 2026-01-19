/**
 * Projection Worker
 *
 * Long-running process that polls events_queue and projects events
 * into read models (run_facts, session_stats, daily aggregates).
 *
 * Supports two processing modes:
 * - WORKER_USE_BATCH_PROCESSOR=true (default): Uses batch processing with SAVEPOINTs
 *   and upfront locking in consistent order to prevent deadlocks. Other workers will
 *   block/wait when processing overlapping data.
 * - WORKER_USE_BATCH_PROCESSOR=false: Uses per-event transactions for maximum
 *   isolation but slower performance.
 */

import { closeDb, getDb } from "@repo/shared/db/client";
import { BatchProcessor } from "./batch-processor.js";
import { Processor } from "./processor.js";

const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_INTERVAL_MS) || 2000;
const BATCH_SIZE = Number(process.env.WORKER_BATCH_SIZE) || 100;
const USE_BATCH_PROCESSOR = process.env.WORKER_USE_BATCH_PROCESSOR !== "false";

let running = true;

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`[Worker] Received ${signal}, shutting down...`);
  running = false;
  await closeDb();
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

async function main() {
  console.log(`[Worker] Starting projection worker`);
  console.log(`[Worker] Poll interval: ${POLL_INTERVAL_MS}ms, Batch size: ${BATCH_SIZE}`);
  console.log(`[Worker] Processor mode: ${USE_BATCH_PROCESSOR ? "batch (SAVEPOINTs)" : "per-event"}`);

  // Initialize db connection at startup
  const db = getDb();

  if (USE_BATCH_PROCESSOR) {
    await runBatchProcessor(db);
  } else {
    await runLegacyProcessor(db);
  }
}

async function runBatchProcessor(db: ReturnType<typeof getDb>) {
  const processor = new BatchProcessor(db, BATCH_SIZE);

  while (running) {
    try {
      const { processed, failed } = await processor.processNextBatch();
      const total = processed + failed;

      if (total === 0) {
        // No events to process, sleep
        await sleep(POLL_INTERVAL_MS);
      } else {
        console.log(`[Worker] Batch complete: ${processed} processed, ${failed} failed`);
      }
    } catch (error) {
      console.error("[Worker] Error processing batch:", error);
      await sleep(POLL_INTERVAL_MS);
    }
  }
}

async function runLegacyProcessor(db: ReturnType<typeof getDb>) {
  const processor = new Processor(db, BATCH_SIZE);

  while (running) {
    try {
      const processed = await processor.processNextBatch();

      if (processed === 0) {
        // No events to process, sleep
        await sleep(POLL_INTERVAL_MS);
      } else {
        console.log(`[Worker] Processed ${processed} events`);
      }
    } catch (error) {
      console.error("[Worker] Error processing batch:", error);
      await sleep(POLL_INTERVAL_MS);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error("[Worker] Fatal error:", error);
  process.exit(1);
});
