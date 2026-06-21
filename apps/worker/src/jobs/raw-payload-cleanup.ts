import { deleteExpiredRawPayloads } from "@oracle/db";
import type { schema } from "@oracle/db";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { ScheduledJob } from "../scheduler";
import type { WorkerLogger } from "../logger";

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
const RETENTION_DAYS = 7;
// ponytail: hardcoded; add env reader when ops needs to tune.
const RETENTION_MS = RETENTION_DAYS * 86_400_000;

export type RawPayloadCleanupJobDeps = {
  db: PostgresJsDatabase<typeof schema>;
  logger: WorkerLogger;
};

export function createRawPayloadCleanupJob(
  deps: RawPayloadCleanupJobDeps,
): ScheduledJob {
  const { db, logger } = deps;

  return {
    name: "raw-payload-cleanup",
    intervalMs: CLEANUP_INTERVAL_MS,
    async run() {
      const cutoff = new Date(Date.now() - RETENTION_MS);

      try {
        const { deletedCount } = await deleteExpiredRawPayloads(db, cutoff);

        logger.info("raw_payload_cleanup.complete", {
          jobName: "raw-payload-cleanup",
          metadata: { deletedCount, cutoff: cutoff.toISOString() },
        });
      } catch (error: unknown) {
        logger.error("raw_payload_cleanup.failed", {
          jobName: "raw-payload-cleanup",
          error,
        });
      }
    },
  };
}
