import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { watchedRegionSnapshot, type SnapshotSignalEntry } from "./app-schema";
import type { schema } from "./schema";

type Database = PostgresJsDatabase<typeof schema>;

export type WatchedRegionSnapshot = {
  id: string;
  watchedRegionId: string;
  takenAt: Date;
  riskScore: number;
  riskLevel: "quiet" | "watch" | "elevated" | "high" | "critical";
  worstSeverity: "minor" | "moderate" | "significant" | "severe" | "extreme" | null;
  contributingSignals: number;
  signals: SnapshotSignalEntry[];
};

export async function upsertWatchedRegionSnapshot(
  db: Database,
  data: WatchedRegionSnapshot,
): Promise<void> {
  await db
    .insert(watchedRegionSnapshot)
    .values(data)
    .onConflictDoUpdate({
      target: watchedRegionSnapshot.id,
      set: {
        takenAt: sql`excluded.taken_at`,
        riskScore: sql`excluded.risk_score`,
        riskLevel: sql`excluded.risk_level`,
        worstSeverity: sql`excluded.worst_severity`,
        contributingSignals: sql`excluded.contributing_signals`,
        signals: sql`excluded.signals`,
      },
    });
}
