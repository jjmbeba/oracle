import { querySignals, upsertWatchedRegionSnapshot, watchedRegion } from "@oracle/db";
import { getRegionMemberCountryIds, matchSignalsToRegion, scoreSignals } from "@oracle/domain";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { schema } from "@oracle/db";
import type { ScheduledJob } from "../scheduler";
import type { WorkerLogger } from "../logger";

const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;
// ponytail: 5-min hardcoded; add env reader when ops needs to tune.

const WINDOW_HOURS = 72;

function snapshotId(watchedRegionId: string, takenAt: Date): string {
  const bucket = Math.floor(takenAt.getTime() / SNAPSHOT_INTERVAL_MS) * SNAPSHOT_INTERVAL_MS;
  return `${watchedRegionId}:${new Date(bucket).toISOString()}`;
}

export type WatchedRegionSnapshotJobDeps = {
  db: PostgresJsDatabase<typeof schema>;
  logger: WorkerLogger;
};

export function createWatchedRegionSnapshotJob(
  deps: WatchedRegionSnapshotJobDeps,
): ScheduledJob {
  const { db, logger } = deps;

  return {
    name: "watched-region-snapshots",
    intervalMs: SNAPSHOT_INTERVAL_MS,
    async run() {
      const watchedRows = await db.select().from(watchedRegion);

      if (watchedRows.length === 0) {
        logger.info("snapshot.no-watched-regions");
        return;
      }

      const now = new Date();
      const since = new Date(now.getTime() - WINDOW_HOURS * 60 * 60 * 1000);
      const allSignals = await querySignals(db, { since });
      let successCount = 0;

      for (const row of watchedRows) {
        try {
          const memberCountryIds = getRegionMemberCountryIds(row.regionId as never);
          const regionSignals = matchSignalsToRegion(allSignals, memberCountryIds);
          const risk = scoreSignals(regionSignals);
          // ponytail: serial per-region loop, parallelize if latency exceeds 5-min budget.

          await upsertWatchedRegionSnapshot(db, {
            id: snapshotId(row.id, now),
            watchedRegionId: row.id,
            takenAt: now,
            riskScore: risk.score,
            riskLevel: risk.level,
            worstSeverity: risk.worstSeverity,
            contributingSignals: risk.contributingSignals,
            signals: regionSignals.map((s) => ({
              dedupeKey: s.dedupeKey,
              severity: s.severity,
              category: s.category,
              occurredAt: s.occurredAt ?? null,
            })),
          });
          successCount++;
        } catch (error: unknown) {
          logger.error("snapshot.region.failed", {
            jobName: "watched-region-snapshots",
            metadata: { watchedRegionId: row.id, regionId: row.regionId },
            error,
          });
        }
      }

      logger.info("snapshot.complete", {
        metadata: { watchedRegionCount: watchedRows.length, successCount },
      });
    },
  };
}
