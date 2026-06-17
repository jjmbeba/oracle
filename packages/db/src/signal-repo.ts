import { and, eq, getTableColumns, gte, inArray, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  normalizedSignalSchema,
  signalGeometrySchema,
} from "@oracle/domain";
import type {
  NormalizedSignal,
  SignalCategory,
  SignalScope,
} from "@oracle/domain";
import { providerFreshness, signal } from "./signal-schema";
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

function buildConflictSet() {
  const cols = getTableColumns(signal);
  const skip = new Set(["id", "createdAt", "updatedAt"]);
  return Object.fromEntries(
    Object.entries(cols)
      .filter(([key]) => !skip.has(key))
      .map(([key, col]) => [key, sql`excluded.${sql.identifier(col.name)}`]),
  ) as Record<string, ReturnType<typeof sql>>;
}

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
      if (row.geometry === null) {
        throw new Error("Scope is geometry but geometry is null");
      }
      return { kind: "geometry", geometry: signalGeometrySchema.parse(row.geometry) };
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
        ...buildConflictSet(),
        updatedAt: sql`now()`,
      },
    })
    .returning();

  return rowToNormalizedSignal(row);
}

export type ProviderFreshness = {
  provider: string;
  category: SignalCategory;
  lastSuccessfulPollAt: Date;
};

export async function upsertProviderFreshness(
  db: Database,
  freshness: ProviderFreshness,
): Promise<ProviderFreshness> {
  const [row] = await db
    .insert(providerFreshness)
    .values({
      provider: freshness.provider,
      category: freshness.category,
      lastSuccessfulPollAt: freshness.lastSuccessfulPollAt,
    })
    .onConflictDoUpdate({
      target: [providerFreshness.provider, providerFreshness.category],
      set: {
        lastSuccessfulPollAt: sql`excluded.last_successful_poll_at`,
        updatedAt: sql`now()`,
      },
    })
    .returning();

  return {
    provider: row.provider,
    category: row.category as SignalCategory,
    lastSuccessfulPollAt: row.lastSuccessfulPollAt,
  };
}

export async function queryProviderFreshness(
  db: Database,
  providerName: string,
  category: SignalCategory,
): Promise<ProviderFreshness | null> {
  const [row] = await db
    .select()
    .from(providerFreshness)
    .where(
      and(
        eq(providerFreshness.provider, providerName),
        eq(providerFreshness.category, category),
      )!,
    )
    .limit(1);

  if (!row) return null;

  return {
    provider: row.provider,
    category: row.category as SignalCategory,
    lastSuccessfulPollAt: row.lastSuccessfulPollAt,
  };
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
