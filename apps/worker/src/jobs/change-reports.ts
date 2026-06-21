import { upsertChangeReport, watchedRegion, watchedRegionSnapshot } from "@oracle/db";
import { diffSnapshots } from "@oracle/domain";
import { desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { schema } from "@oracle/db";
import type { ScheduledJob } from "../scheduler";
import type { WorkerLogger } from "../logger";

const CHANGE_REPORT_INTERVAL_MS = 5 * 60 * 1000;

export type ChangeReportJobDeps = {
  db: PostgresJsDatabase<typeof schema>;
  logger: WorkerLogger;
};

export function createChangeReportJob(deps: ChangeReportJobDeps): ScheduledJob {
  const { db, logger } = deps;

  return {
    name: "change-reports",
    intervalMs: CHANGE_REPORT_INTERVAL_MS,
    async run() {
      const watchedRows = await db.select().from(watchedRegion);

      if (watchedRows.length === 0) {
        logger.info("change-report.no-watched-regions");
        return;
      }

      let successCount = 0;

      for (const row of watchedRows) {
        try {
          const snapshots = await db
            .select()
            .from(watchedRegionSnapshot)
            .where(eq(watchedRegionSnapshot.watchedRegionId, row.id))
            .orderBy(desc(watchedRegionSnapshot.takenAt))
            .limit(2);

          if (snapshots.length === 0) {
            continue;
          }

          const current = snapshots[0];
          const previous = snapshots[1] ?? null;

          const report = diffSnapshots(
            previous?.signals ?? [],
            current.signals,
            previous ? { score: previous.riskScore, level: previous.riskLevel } : null,
            { score: current.riskScore, level: current.riskLevel },
          );

          await upsertChangeReport(db, {
            id: current.id,
            watchedRegionId: row.id,
            generatedAt: new Date(),
            newSignals: report.newSignals,
            expiredSignals: report.expiredSignals,
            severityChanges: report.severityChanges,
            riskMovement: report.riskMovement,
          });

          successCount++;
        } catch (error: unknown) {
          logger.error("change-report.region.failed", {
            jobName: "change-reports",
            metadata: { watchedRegionId: row.id, regionId: row.regionId },
            error,
          });
        }
      }

      logger.info("change-report.complete", {
        metadata: { watchedRegionCount: watchedRows.length, successCount },
      });
    },
  };
}
