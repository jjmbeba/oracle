import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { insertRawPayload, upsertProviderFreshness, upsertSignal } from "@oracle/db";
import type { schema } from "@oracle/db";
import type { NormalizedRejection, NormalizedSignal, SignalCategory } from "@oracle/domain";
import type { ScheduledJob } from "../scheduler";
import type { WorkerLogger } from "../logger";
import type { JsonFetchWithRaw } from "../providers/fetch-json";

export type ProviderFetcher = () => Promise<JsonFetchWithRaw>;

export type ProviderNormalizer = (data: unknown) => {
  signals: NormalizedSignal[];
  skipped: readonly NormalizedRejection[];
};

export type IngestionJobConfig = {
  name: string;
  provider: string;
  category: SignalCategory;
  fetchData: ProviderFetcher;
  normalize: ProviderNormalizer;
  logPrefix: string;
  intervalMs: number;
};

export type IngestionJobDeps = {
  db: PostgresJsDatabase<typeof schema>;
  logger: WorkerLogger;
};

export function createIngestionJob(
  config: IngestionJobConfig,
  deps: IngestionJobDeps,
): ScheduledJob {
  const { db, logger } = deps;
  const { name, provider, category, fetchData, normalize, logPrefix } = config;

  return {
    name,
    intervalMs: config.intervalMs,
    async run() {
      let fetchResult: JsonFetchWithRaw;
      try {
        fetchResult = await fetchData();
      } catch (error: unknown) {
        logger.error(`${logPrefix}.fetch.failed`, {
          jobName: name,
          error,
        });
        return;
      }

      const { data, rawFetches } = fetchResult;

      let normalized: ReturnType<ProviderNormalizer>;
      try {
        normalized = normalize(data);
      } catch (error: unknown) {
        logger.error(`${logPrefix}.normalize.failed`, {
          jobName: name,
          error,
        });
        return;
      }

      const { signals, skipped } = normalized;
      logger.info(`${logPrefix}.normalized`, {
        metadata: { signalCount: signals.length, skippedCount: skipped.length },
      });

      for (const rejection of skipped) {
        logger.warn(`${logPrefix}.normalize.rejected`, {
          jobName: name,
          metadata: { ...rejection },
        });
      }

      let upsertedCount = 0;

      for (const signal of signals) {
        try {
          await upsertSignal(db, signal);
          upsertedCount++;
        } catch (error: unknown) {
          logger.error(`${logPrefix}.upsert.failed`, {
            jobName: name,
            error,
            metadata: { dedupeKey: signal.dedupeKey },
          });
        }
      }

      const fetchedAt = new Date();

      for (const raw of rawFetches) {
        try {
          await insertRawPayload(db, {
            id: crypto.randomUUID(),
            provider,
            category,
            sourceUrl: raw.url,
            jobName: name,
            httpStatus: raw.response.status,
            payload: raw.data,
            fetchedAt,
          });
        } catch (error: unknown) {
          logger.warn(`${logPrefix}.raw_payload.persist_failed`, {
            jobName: name,
            error,
          });
        }
      }

      try {
        await upsertProviderFreshness(db, {
          provider,
          category,
          lastSuccessfulPollAt: new Date(),
        });
      } catch (error: unknown) {
        logger.error(`${logPrefix}.freshness.failed`, {
          jobName: name,
          error,
        });
      }

      logger.info(`${logPrefix}.ingestion.complete`, {
        metadata: {
          upsertedCount,
          skippedCount: skipped.length,
        },
      });
    },
  };
}
