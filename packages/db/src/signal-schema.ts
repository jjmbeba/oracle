import { doublePrecision, index, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const signal = pgTable(
  "signal",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    providerEventId: text("provider_event_id"),
    possibleCrossProviderDuplicateKey: text("possible_cross_provider_duplicate_key"),
    category: text("category", {
      enum: ["earthquake", "weather", "space-weather"],
    }).notNull(),
    title: text("title").notNull(),
    severity: text("severity", {
      enum: ["minor", "moderate", "significant", "severe", "extreme"],
    }).notNull(),
    confidence: text("confidence", {
      enum: ["high", "medium", "low"],
    }).notNull(),
    effectiveAt: timestamp("effective_at", { withTimezone: true }).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    scopeKind: text("scope_kind", {
      enum: ["global", "region", "point", "geometry"],
    }).notNull(),
    regionId: text("region_id"),
    longitude: doublePrecision("longitude"),
    latitude: doublePrecision("latitude"),
    geometry: jsonb("geometry"),
    sourceLinkUrl: text("source_link_url"),
    sourceLinkLabel: text("source_link_label"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("signal_dedupe_key_unique").on(table.dedupeKey),
    index("signal_category_idx").on(table.category),
    index("signal_effective_at_idx").on(table.effectiveAt),
    index("signal_scope_region_idx").on(table.scopeKind, table.regionId),
  ],
);
