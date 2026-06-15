import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
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
