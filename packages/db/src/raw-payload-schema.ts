import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const providerPayload = pgTable(
  "provider_payload",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull(),
    category: text("category", {
      enum: ["earthquake", "weather", "space-weather"],
    }).notNull(),
    sourceUrl: text("source_url").notNull(),
    contentHash: text("content_hash").notNull(),
    payload: jsonb("payload").notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
    jobName: text("job_name").notNull(),
    httpStatus: integer("http_status").notNull(),
  },
  (table) => [
    uniqueIndex("provider_payload_dedup_idx").on(
      table.provider,
      table.sourceUrl,
      table.contentHash,
    ),
    index("provider_payload_fetched_at_idx").on(table.fetchedAt),
  ],
);
