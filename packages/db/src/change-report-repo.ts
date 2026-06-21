import { desc, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { changeReport } from "./app-schema";
import type { schema } from "./schema";

type Database = PostgresJsDatabase<typeof schema>;

export type ChangeReportRow = {
  id: string;
  watchedRegionId: string;
  generatedAt: Date;
  newSignals: import("@oracle/domain").ChangeReportEntry[];
  expiredSignals: import("@oracle/domain").ChangeReportEntry[];
  severityChanges: import("@oracle/domain").SeverityChangeEntry[];
  riskMovement: import("@oracle/domain").RiskMovement | null;
};

export async function upsertChangeReport(
  db: Database,
  data: ChangeReportRow,
): Promise<void> {
  await db
    .insert(changeReport)
    .values(data)
    .onConflictDoUpdate({
      target: changeReport.id,
      set: {
        generatedAt: sql`excluded.generated_at`,
        newSignals: sql`excluded.new_signals`,
        expiredSignals: sql`excluded.expired_signals`,
        severityChanges: sql`excluded.severity_changes`,
        riskMovement: sql`excluded.risk_movement`,
      },
    });
}

export async function getLatestChangeReport(
  db: Database,
  watchedRegionId: string,
): Promise<ChangeReportRow | undefined> {
  const rows = await db
    .select()
    .from(changeReport)
    .where(eq(changeReport.watchedRegionId, watchedRegionId))
    .orderBy(desc(changeReport.generatedAt))
    .limit(1);
  return rows[0];
}
