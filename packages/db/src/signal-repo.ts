import { and, eq, gte, inArray, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { normalizedSignalSchema } from "@oracle/domain";
import type {
  NormalizedSignal,
  SignalCategory,
  SignalScope,
} from "@oracle/domain";
import { signal } from "./signal-schema";
import type { schema } from "./schema";

export type SignalQueryFilters = {
  since: Date;
  category?: SignalCategory;
  regionIds?: string[];
};

type ScopeColumns = {
  scopeKind: "global" | "region" | "point" | "geometry";
  regionId: string | null;
  longitude: number | null;
  latitude: number | null;
  geometry: unknown | null;
};

const decomposeScope = (scope: SignalScope): ScopeColumns => {
  switch (scope.kind) {
    case "global":
      return {
        scopeKind: "global",
        regionId: null,
        longitude: null,
        latitude: null,
        geometry: null,
      };
    case "region":
      return {
        scopeKind: "region",
        regionId: scope.regionId,
        longitude: null,
        latitude: null,
        geometry: null,
      };
    case "point":
      return {
        scopeKind: "point",
        regionId: null,
        longitude: scope.coordinates[0],
        latitude: scope.coordinates[1],
        geometry: null,
      };
    case "geometry":
      return {
        scopeKind: "geometry",
        regionId: null,
        longitude: null,
        latitude: null,
        geometry: scope.geometry as unknown,
      };
  }
};

type SignalRow = typeof signal.$inferSelect;

const reconstructScope = (row: SignalRow): SignalScope => {
  switch (row.scopeKind) {
    case "global":
      return { kind: "global" };
    case "region":
      if (!row.regionId) {
        throw new Error("Scope is region but regionId is null");
      }
      return { kind: "region", regionId: row.regionId };
    case "point":
      if (row.longitude == null || row.latitude == null) {
        throw new Error("Scope is point but coordinates are null");
      }
      return { kind: "point", coordinates: [row.longitude, row.latitude] };
    case "geometry":
      return { kind: "geometry", geometry: row.geometry as Extract<SignalScope, { kind: "geometry" }>["geometry"] };
    default:
      throw new Error(`Unknown scope kind: ${row.scopeKind}`);
  }
};

const reconstructSourceLink = (
  url: string | null,
  label: string | null,
): { url: string; label?: string } | undefined => {
  if (!url) return undefined;
  return label ? { url, label } : { url };
};

const dateToIsoString = (d: Date | null): string | undefined =>
  d?.toISOString() ?? undefined;

const rowToNormalizedSignal = (row: SignalRow): NormalizedSignal =>
  normalizedSignalSchema.parse({
    provider: row.provider,
    dedupeKey: row.dedupeKey,
    providerEventId: row.providerEventId ?? undefined,
    possibleCrossProviderDuplicateKey:
      row.possibleCrossProviderDuplicateKey ?? undefined,
    category: row.category,
    title: row.title,
    severity: row.severity,
    confidence: row.confidence,
    effectiveAt: row.effectiveAt.toISOString(),
    occurredAt: dateToIsoString(row.occurredAt),
    issuedAt: dateToIsoString(row.issuedAt),
    scope: reconstructScope(row),
    sourceLink: reconstructSourceLink(row.sourceLinkUrl, row.sourceLinkLabel),
  });

type Database = PostgresJsDatabase<typeof schema>;

export async function upsertSignal(
  db: Database,
  signalData: NormalizedSignal,
): Promise<NormalizedSignal> {
  const [row] = await db
    .insert(signal)
    .values({
      id: crypto.randomUUID(),
      provider: signalData.provider,
      dedupeKey: signalData.dedupeKey,
      providerEventId: signalData.providerEventId ?? null,
      possibleCrossProviderDuplicateKey:
        signalData.possibleCrossProviderDuplicateKey ?? null,
      category: signalData.category,
      title: signalData.title,
      severity: signalData.severity,
      confidence: signalData.confidence,
      effectiveAt: new Date(signalData.effectiveAt),
      occurredAt: signalData.occurredAt
        ? new Date(signalData.occurredAt)
        : null,
      issuedAt: signalData.issuedAt ? new Date(signalData.issuedAt) : null,
      ...decomposeScope(signalData.scope),
      sourceLinkUrl: signalData.sourceLink?.url ?? null,
      sourceLinkLabel: signalData.sourceLink?.label ?? null,
    })
    .onConflictDoUpdate({
      target: signal.dedupeKey,
      set: {
        provider: sql`excluded.provider`,
        category: sql`excluded.category`,
        title: sql`excluded.title`,
        severity: sql`excluded.severity`,
        confidence: sql`excluded.confidence`,
        effectiveAt: sql`excluded.effective_at`,
        occurredAt: sql`excluded.occurred_at`,
        issuedAt: sql`excluded.issued_at`,
        scopeKind: sql`excluded.scope_kind`,
        regionId: sql`excluded.region_id`,
        longitude: sql`excluded.longitude`,
        latitude: sql`excluded.latitude`,
        geometry: sql`excluded.geometry`,
        sourceLinkUrl: sql`excluded.source_link_url`,
        sourceLinkLabel: sql`excluded.source_link_label`,
        providerEventId: sql`excluded.provider_event_id`,
        possibleCrossProviderDuplicateKey:
          sql`excluded.possible_cross_provider_duplicate_key`,
      },
    })
    .returning();

  return rowToNormalizedSignal(row);
}

export async function querySignals(
  db: Database,
  filters: SignalQueryFilters,
): Promise<NormalizedSignal[]> {
  const conditions = [gte(signal.effectiveAt, filters.since)];

  if (filters.category) {
    conditions.push(eq(signal.category, filters.category));
  }

  // Only region-scoped signals match regionId filters; point/geometry/global scopes lack a regionId and are excluded by design.
  if (filters.regionIds && filters.regionIds.length > 0) {
    conditions.push(
      and(
        eq(signal.scopeKind, "region"),
        inArray(signal.regionId, filters.regionIds),
      )!,
    );
  }

  const rows = await db
    .select()
    .from(signal)
    .where(and(...conditions)!)
    .orderBy(signal.effectiveAt);

  return rows.map(rowToNormalizedSignal);
}
