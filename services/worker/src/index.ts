/**
 * Projection Worker
 *
 * Long-running process that polls events_queue and projects events
 * into read models (run_facts, session_stats, daily aggregates).
 */

import { closeDb } from "@repo/shared/db/client";
import { Processor } from "./processor.js";

const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_INTERVAL_MS) || 2000;
const BATCH_SIZE = Number(process.env.WORKER_BATCH_SIZE) || 100;

let running = true;
let processor: Processor;

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

  processor = new Processor(BATCH_SIZE);

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
      // Sleep on error to avoid tight loop
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
