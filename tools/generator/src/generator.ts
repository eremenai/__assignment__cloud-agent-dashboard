/**
 * Event Generator
 *
 * Generates realistic mock events for multiple orgs/users.
 */

import type { AnalyticsEvent } from "@repo/shared/types";
import { ORG_PATTERNS, generateSession, type OrgPattern } from "./patterns.js";

export interface GeneratorOptions {
  ingestUrl: string;
  dryRun: boolean;
  batchSize: number;
}

export interface GeneratorStats {
  totalEvents: number;
  sessions: number;
  runs: number;
  handoffs: number;
}

export class Generator {
  private options: GeneratorOptions;

  constructor(options: GeneratorOptions) {
    this.options = options;
  }

  async generate(from: Date, to: Date): Promise<GeneratorStats> {
    const stats: GeneratorStats = {
      totalEvents: 0,
      sessions: 0,
      runs: 0,
      handoffs: 0,
    };

    const events: AnalyticsEvent[] = [];

    // Generate events day by day
    const currentDate = new Date(from);
    while (currentDate <= to) {
      const dayEvents = this.generateDay(currentDate, stats);
      events.push(...dayEvents);
      currentDate.setDate(currentDate.getDate() + 1);

      // Show progress
      const progress = Math.round(
        ((currentDate.getTime() - from.getTime()) / (to.getTime() - from.getTime())) * 100
      );
      process.stdout.write(`\rGenerating: ${progress}% (${events.length} events)`);
    }
    process.stdout.write("\n");

    // Send events to ingest API
    if (!this.options.dryRun) {
      console.log(`\nSending ${events.length} events to ${this.options.ingestUrl}...`);
      await this.sendEvents(events);
    }

    stats.totalEvents = events.length;
    return stats;
  }

  private generateDay(date: Date, stats: GeneratorStats): AnalyticsEvent[] {
    const events: AnalyticsEvent[] = [];
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    for (const pattern of ORG_PATTERNS) {
      const dailyEvents = this.generateOrgDay(date, pattern, isWeekend, stats);
      events.push(...dailyEvents);
    }

    return events;
  }

  private generateOrgDay(
    date: Date,
    pattern: OrgPattern,
    isWeekend: boolean,
    stats: GeneratorStats
  ): AnalyticsEvent[] {
    const events: AnalyticsEvent[] = [];

    // Reduce weekend activity
    const weekendMultiplier = isWeekend ? (date.getDay() === 6 ? 0.4 : 0.25) : 1;
    const baseSessions = Math.round(
      (pattern.minDailySessions +
        Math.random() * (pattern.maxDailySessions - pattern.minDailySessions)) *
        weekendMultiplier
    );

    const sessionCount = Math.max(0, baseSessions);

    for (let i = 0; i < sessionCount; i++) {
      // Pick a random user from this org
      const userId = pattern.users[Math.floor(Math.random() * pattern.users.length)];

      const sessionEvents = generateSession({
        orgId: pattern.orgId,
        userId,
        date,
        successRate: pattern.successRate,
        handoffRate: pattern.handoffRate,
        isWeekend,
      });

      events.push(...sessionEvents);
      stats.sessions++;
      stats.runs += sessionEvents.filter((e) => e.event_type === "run_completed").length;
      stats.handoffs += sessionEvents.filter((e) => e.event_type === "local_handoff").length;
    }

    return events;
  }

  private async sendEvents(events: AnalyticsEvent[]): Promise<void> {
    const { batchSize, ingestUrl } = this.options;

    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      const progress = Math.round(((i + batch.length) / events.length) * 100);
      process.stdout.write(`\rSending: ${progress}%`);

      const response = await fetch(ingestUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: batch }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Ingest failed: ${response.status} ${text}`);
      }
    }
    process.stdout.write("\n");
  }
}
