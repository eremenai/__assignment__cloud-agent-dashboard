#!/usr/bin/env node
/**
 * Mock Event Generator CLI
 *
 * Generates realistic mock events and POSTs them to the Ingest API.
 */

import { program } from "commander";
import { Generator } from "./generator.js";

const INGEST_URL = process.env.INGEST_URL || "http://localhost:3001/events";

program
  .name("generate")
  .description("Generate mock events for the analytics dashboard")
  .option("-d, --days <number>", "Number of days of history to generate", "30")
  .option("--from <date>", "Start date (YYYY-MM-DD)")
  .option("--to <date>", "End date (YYYY-MM-DD)")
  .option("--dry-run", "Show what would be generated without sending")
  .option("--url <url>", "Ingest API URL", INGEST_URL)
  .option("--batch-size <number>", "Events per batch", "50")
  .action(async (options) => {
    const now = new Date();
    let fromDate: Date;
    let toDate: Date;

    if (options.from && options.to) {
      fromDate = new Date(options.from);
      toDate = new Date(options.to);
    } else {
      const days = Number.parseInt(options.days, 10);
      toDate = now;
      fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    }

    const generator = new Generator({
      ingestUrl: options.url,
      dryRun: options.dryRun ?? false,
      batchSize: Number.parseInt(options.batchSize, 10),
    });

    console.log(`\n📊 Mock Event Generator`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`From:       ${fromDate.toISOString().split("T")[0]}`);
    console.log(`To:         ${toDate.toISOString().split("T")[0]}`);
    console.log(`Ingest URL: ${options.url}`);
    console.log(`Dry run:    ${options.dryRun ? "Yes" : "No"}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    try {
      const stats = await generator.generate(fromDate, toDate);

      console.log(`\n✅ Generation complete!`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Total events:   ${stats.totalEvents}`);
      console.log(`Sessions:       ${stats.sessions}`);
      console.log(`Runs:           ${stats.runs}`);
      console.log(`Handoffs:       ${stats.handoffs}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    } catch (error) {
      console.error("\n❌ Generation failed:", error);
      process.exit(1);
    }
  });

program.parse();
