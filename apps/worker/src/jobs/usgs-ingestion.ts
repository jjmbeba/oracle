import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { upsertProviderFreshness, upsertSignal } from "@oracle/db";
import type { schema } from "@oracle/db";
import { normalizeUsgsResponse } from "../providers/usgs/normalizer";
import { fetchUsgsSignals, type UsgsFetchResult } from "../providers/usgs/fetch";
import type { ScheduledJob } from "../scheduler";
import type { WorkerLogger } from "../logger";
import { readUsgsPollIntervalMs } from "../config";

export type UsgsIngestionJobOptions = {
  db: PostgresJsDatabase<typeof schema>;
  fetchFn?: typeof globalThis.fetch;
  url?: string;
  logger: WorkerLogger;
  env?: NodeJS.ProcessEnv;
};

export function createUsgsIngestionJob(options: UsgsIngestionJobOptions): ScheduledJob {
  const {
    db,
    fetchFn,
    url,
    logger,
    env,
  } = options;
  const intervalMs = readUsgsPollIntervalMs(env);

  return {
    name: "usgs-ingestion",
    intervalMs,
    async run() {
      let fetchResult: UsgsFetchResult;

      try {
        fetchResult = await fetchUsgsSignals(fetchFn, url);
      } catch (error: unknown) {
        logger.error("usgs.fetch.failed", { error });
        return;
      }

      const { signals, skipped } = normalizeUsgsResponse(fetchResult.data);

      logger.info("usgs.normalized", {
        metadata: { signalCount: signals.length, skippedCount: skipped.length },
      });

      let upsertedCount = 0;

      for (const signal of signals) {
        try {
          await upsertSignal(db, signal);
          upsertedCount++;
        } catch (error: unknown) {
          logger.error("usgs.upsert.failed", {
            jobName: "usgs-ingestion",
            error,
            metadata: { dedupeKey: signal.dedupeKey },
          });
        }
      }

      try {
        await upsertProviderFreshness(db, {
          provider: "usgs",
          category: "earthquake",
          lastSuccessfulPollAt: new Date(),
        });
      } catch (error: unknown) {
        logger.error("usgs.freshness.failed", {
          jobName: "usgs-ingestion",
          error,
        });
      }

      logger.info("usgs.ingestion.complete", {
        metadata: {
          upsertedCount,
          skippedCount: skipped.length,
        },
      });
    },
  };
}
