import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { SignalCategory, SignalSeverity } from "@oracle/domain";
import { user } from "./auth-schema";

export const watchedRegion = pgTable(
  "watched_region",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    regionId: text("region_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("watched_region_user_region_unique").on(table.userId, table.regionId),
    index("watched_region_user_id_idx").on(table.userId),
  ],
);

export type SnapshotSignalEntry = {
  readonly dedupeKey: string;
  readonly severity: SignalSeverity;
  readonly category: SignalCategory;
  readonly occurredAt: string | null;
};

export const watchedRegionSnapshot = pgTable(
  "watched_region_snapshot",
  {
    id: text("id").primaryKey(),
    watchedRegionId: text("watched_region_id")
      .notNull()
      .references(() => watchedRegion.id, { onDelete: "cascade" }),
    takenAt: timestamp("taken_at", { withTimezone: true }).notNull(),
    riskScore: integer("risk_score").notNull(),
    riskLevel: text("risk_level", {
      enum: ["quiet", "watch", "elevated", "high", "critical"],
    }).notNull(),
    worstSeverity: text("worst_severity", {
      enum: ["minor", "moderate", "significant", "severe", "extreme"],
    }),
    contributingSignals: integer("contributing_signals").notNull(),
    signals: jsonb("signals").$type<SnapshotSignalEntry[]>().notNull(),
  },
  (table) => [
    index("wrs_region_taken_idx").on(table.watchedRegionId, table.takenAt),
  ],
);
