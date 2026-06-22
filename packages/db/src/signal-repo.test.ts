import { describe, expect, it, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { NormalizedSignal } from "@oracle/domain";
import { createDatabaseConnection } from "./index";
import { signal } from "./signal-schema";
import {
  upsertSignal,
  querySignals,
  querySignalFeed,
  upsertProviderFreshness,
  queryProviderFreshness,
} from "./signal-repo";
import type { schema } from "./schema";

const databaseUrl = process.env.DATABASE_URL;
const itIfDb = databaseUrl ? it : it.skip;

let db: PostgresJsDatabase<typeof schema>;
let close: () => Promise<void>;

beforeAll(() => {
  if (!databaseUrl) return;
  const conn = createDatabaseConnection(databaseUrl);
  db = conn.db;
  close = conn.close;
});

afterAll(async () => {
  await close?.();
});

beforeEach(async () => {
  if (!db) return;
  await db.execute(sql`BEGIN`);
});

afterEach(async () => {
  if (!db) return;
  await db.execute(sql`ROLLBACK`);
});

const makeSignal = (overrides: Partial<NormalizedSignal> = {}): NormalizedSignal => ({
  provider: "test-provider",
  dedupeKey: `signal:earthquake:test-provider:provider-native:test-${crypto.randomUUID()}`,
  category: "earthquake",
  title: "Test Earthquake",
  severity: "moderate",
  confidence: "medium",
  effectiveAt: new Date().toISOString(),
  scope: { kind: "global" },
  ...overrides,
});

describe("signal repo", () => {
  describe("upsertSignal", () => {
    itIfDb("inserts a new signal and returns it", async () => {
      const signalData = makeSignal({ title: "Insert Test" });
      const result = await upsertSignal(db, signalData);

      expect(result).toBeDefined();
      expect(result.dedupeKey).toBe(signalData.dedupeKey);
      expect(result.title).toBe("Insert Test");
      expect(result.category).toBe("earthquake");
      expect(result.provider).toBe("test-provider");
    });

    itIfDb("updates an existing signal with the same dedupe key", async () => {
      const dedupeKey = `signal:earthquake:test-provider:provider-native:upsert-test-${crypto.randomUUID()}`;
      const original = makeSignal({
        dedupeKey,
        title: "Original Title",
        severity: "minor",
      });
      await upsertSignal(db, original);

      const updated = makeSignal({
        dedupeKey,
        title: "Updated Title",
        severity: "severe",
      });
      const result = await upsertSignal(db, updated);

      expect(result.title).toBe("Updated Title");
      expect(result.severity).toBe("severe");
    });

    itIfDb("refreshes updatedAt on conflict", async () => {
      const dedupeKey = `signal:earthquake:test-provider:provider-native:updatetime-test-${crypto.randomUUID()}`;
      await upsertSignal(db, makeSignal({ dedupeKey, title: "First" }));

      const [before] = await db
        .select({ updatedAt: signal.updatedAt })
        .from(signal)
        .where(eq(signal.dedupeKey, dedupeKey));

      // Ensure enough time passes for a distinct timestamp
      await new Promise((r) => setTimeout(r, 5));

      await upsertSignal(db, makeSignal({ dedupeKey, title: "Second" }));

      const [after] = await db
        .select({ updatedAt: signal.updatedAt })
        .from(signal)
        .where(eq(signal.dedupeKey, dedupeKey));

      expect(after.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime());
    });

    itIfDb("creates separate rows for different dedupe keys", async () => {
      const signalA = makeSignal({
        dedupeKey: `signal:weather:test-provider:provider-native:a-${crypto.randomUUID()}`,
        title: "Signal A",
        category: "weather",
      });
      const signalB = makeSignal({
        dedupeKey: `signal:weather:test-provider:provider-native:b-${crypto.randomUUID()}`,
        title: "Signal B",
        category: "weather",
      });

      const resultA = await upsertSignal(db, signalA);
      const resultB = await upsertSignal(db, signalB);

      expect(resultA.dedupeKey).not.toBe(resultB.dedupeKey);
      expect(resultA.title).toBe("Signal A");
      expect(resultB.title).toBe("Signal B");
    });

    itIfDb("stores and retrieves all four scope variants", async () => {
      const scopes = [
        { kind: "global" as const },
        { kind: "region" as const, regionId: "country:ke" as const },
        { kind: "point" as const, coordinates: [36.8219, -1.2921] as [number, number] },
        {
          kind: "geometry" as const,
          geometry: {
            type: "Polygon" as const,
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 1],
                [0, 0],
              ],
            ],
          },
        },
      ];

      for (let i = 0; i < scopes.length; i++) {
        const signalData = makeSignal({
          dedupeKey: `signal:earthquake:test-provider:provider-native:scope-test-${i}-${crypto.randomUUID()}`,
          title: `Scope test ${i}`,
          scope: scopes[i] as NormalizedSignal["scope"],
        });
        const result = await upsertSignal(db, signalData);

        expect(result.scope).toEqual(scopes[i]);
      }
    });

    itIfDb("stores and retrieves source links", async () => {
      const signalData = makeSignal({
        dedupeKey: `signal:earthquake:test-provider:provider-native:source-test-${crypto.randomUUID()}`,
        sourceLink: { url: "https://example.com/test", label: "Test Source" },
      });
      const result = await upsertSignal(db, signalData);

      expect(result.sourceLink).toEqual({
        url: "https://example.com/test",
        label: "Test Source",
      });
    });

    itIfDb("stores and retrieves optional provider metadata", async () => {
      const signalData = makeSignal({
        dedupeKey: `signal:earthquake:test-provider:provider-native:meta-test-${crypto.randomUUID()}`,
        providerEventId: "evt-123",
        possibleCrossProviderDuplicateKey: "cross-provider-key",
        occurredAt: new Date("2026-01-01T00:00:00Z").toISOString(),
        issuedAt: new Date("2026-01-01T01:00:00Z").toISOString(),
      });
      const result = await upsertSignal(db, signalData);

      expect(result.providerEventId).toBe("evt-123");
      expect(result.possibleCrossProviderDuplicateKey).toBe("cross-provider-key");
      expect(result.occurredAt).toBe("2026-01-01T00:00:00.000Z");
      expect(result.issuedAt).toBe("2026-01-01T01:00:00.000Z");
    });
  });

  describe("querySignals with includeGlobalScope", () => {
    itIfDb("returns region-scoped matches and global signals together", async () => {
      const regionSignal = makeSignal({
        dedupeKey: `signal:earthquake:test-provider:provider-native:glob-region-${crypto.randomUUID()}`,
        title: "Region Signal",
        scope: { kind: "region", regionId: "country:ke" },
      });
      const globalSignal = makeSignal({
        dedupeKey: `signal:earthquake:test-provider:provider-native:glob-global-${crypto.randomUUID()}`,
        title: "Global Signal",
        scope: { kind: "global" },
      });
      const otherRegionSignal = makeSignal({
        dedupeKey: `signal:earthquake:test-provider:provider-native:glob-other-${crypto.randomUUID()}`,
        title: "Other Region Signal",
        scope: { kind: "region", regionId: "country:ug" },
      });
      const pointSignal = makeSignal({
        dedupeKey: `signal:earthquake:test-provider:provider-native:glob-point-${crypto.randomUUID()}`,
        title: "Point Signal",
        scope: { kind: "point", coordinates: [36.82, -1.29] as [number, number] },
      });
      await upsertSignal(db, regionSignal);
      await upsertSignal(db, globalSignal);
      await upsertSignal(db, otherRegionSignal);
      await upsertSignal(db, pointSignal);

      const results = await querySignals(db, {
        since: new Date("2025-01-01"),
        regionIds: ["country:ke"],
        includeGlobalScope: true,
      });

      const titles = results.map((s) => s.title);
      expect(titles).toContain("Region Signal");
      expect(titles).toContain("Global Signal");
      expect(titles).not.toContain("Other Region Signal");
      expect(titles).not.toContain("Point Signal");
    });

    itIfDb("returns only global signals when no regionIds given", async () => {
      const globalSignal = makeSignal({
        dedupeKey: `signal:earthquake:test-provider:provider-native:glob-only-${crypto.randomUUID()}`,
        title: "Lonely Global",
        scope: { kind: "global" },
      });
      const regionSignal = makeSignal({
        dedupeKey: `signal:earthquake:test-provider:provider-native:glob-r-${crypto.randomUUID()}`,
        title: "Lonely Region",
        scope: { kind: "region", regionId: "country:ke" },
      });
      await upsertSignal(db, globalSignal);
      await upsertSignal(db, regionSignal);

      const results = await querySignals(db, {
        since: new Date("2025-01-01"),
        includeGlobalScope: true,
      });

      const titles = results.map((s) => s.title);
      expect(titles).toContain("Lonely Global");
      expect(titles).not.toContain("Lonely Region");
    });

    itIfDb("excludes global signals when includeGlobalScope is not set", async () => {
      const globalSignal = makeSignal({
        dedupeKey: `signal:earthquake:test-provider:provider-native:glob-no-${crypto.randomUUID()}`,
        title: "No-Include Global",
        scope: { kind: "global" },
      });
      const regionSignal = makeSignal({
        dedupeKey: `signal:earthquake:test-provider:provider-native:glob-nr-${crypto.randomUUID()}`,
        title: "No-Include Region",
        scope: { kind: "region", regionId: "country:ke" },
      });
      await upsertSignal(db, globalSignal);
      await upsertSignal(db, regionSignal);

      const results = await querySignals(db, {
        since: new Date("2025-01-01"),
        regionIds: ["country:ke"],
      });

      const titles = results.map((s) => s.title);
      expect(titles).toContain("No-Include Region");
      expect(titles).not.toContain("No-Include Global");
    });
  });

  describe("querySignals", () => {
    itIfDb("returns signals within the time window", async () => {
      const recentSignal = makeSignal({
        dedupeKey: `signal:earthquake:test-provider:provider-native:recent-${crypto.randomUUID()}`,
        title: "Recent Signal",
        effectiveAt: new Date().toISOString(),
      });
      const oldSignal = makeSignal({
        dedupeKey: `signal:earthquake:test-provider:provider-native:old-${crypto.randomUUID()}`,
        title: "Old Signal",
        effectiveAt: new Date("2020-01-01").toISOString(),
      });
      await upsertSignal(db, recentSignal);
      await upsertSignal(db, oldSignal);

      const results = await querySignals(db, {
        since: new Date("2025-01-01"),
      });

      expect(results.some((s) => s.title === "Recent Signal")).toBe(true);
      expect(results.some((s) => s.title === "Old Signal")).toBe(false);
    });

    itIfDb("filters by category", async () => {
      const earthquake = makeSignal({
        dedupeKey: `signal:earthquake:test-provider:provider-native:cat-eq-${crypto.randomUUID()}`,
        title: "Earthquake Signal",
        category: "earthquake",
      });
      const weather = makeSignal({
        dedupeKey: `signal:weather:test-provider:provider-native:cat-wx-${crypto.randomUUID()}`,
        title: "Weather Signal",
        category: "weather",
      });
      await upsertSignal(db, earthquake);
      await upsertSignal(db, weather);

      const results = await querySignals(db, {
        since: new Date("2025-01-01"),
        category: "weather",
      });

      expect(results.some((s) => s.title === "Weather Signal")).toBe(true);
      expect(results.some((s) => s.title === "Earthquake Signal")).toBe(false);
    });

    itIfDb("filters by region IDs", async () => {
      const kenyaSignal = makeSignal({
        dedupeKey: `signal:earthquake:test-provider:provider-native:reg-ke-${crypto.randomUUID()}`,
        title: "Kenya Signal",
        scope: { kind: "region", regionId: "country:ke" },
      });
      const ugandaSignal = makeSignal({
        dedupeKey: `signal:earthquake:test-provider:provider-native:reg-ug-${crypto.randomUUID()}`,
        title: "Uganda Signal",
        scope: { kind: "region", regionId: "country:ug" },
      });
      await upsertSignal(db, kenyaSignal);
      await upsertSignal(db, ugandaSignal);

      const results = await querySignals(db, {
        since: new Date("2025-01-01"),
        regionIds: ["country:ke"],
      });

      expect(results.some((s) => s.title === "Kenya Signal")).toBe(true);
      expect(results.some((s) => s.title === "Uganda Signal")).toBe(false);
    });

    itIfDb("returns global signals but not region-scoped when no region filter", async () => {
      const globalSignal = makeSignal({
        dedupeKey: `signal:earthquake:test-provider:provider-native:global-${crypto.randomUUID()}`,
        title: "Global Signal",
        scope: { kind: "global" },
      });
      const regionSignal = makeSignal({
        dedupeKey: `signal:earthquake:test-provider:provider-native:region-${crypto.randomUUID()}`,
        title: "Region Signal",
        scope: { kind: "region", regionId: "country:ke" },
      });
      await upsertSignal(db, globalSignal);
      await upsertSignal(db, regionSignal);

      const results = await querySignals(db, {
        since: new Date("2025-01-01"),
      });

      expect(results.some((s) => s.title === "Global Signal")).toBe(true);
      expect(results.some((s) => s.title === "Region Signal")).toBe(true);
    });

    itIfDb("returns results ordered by effectiveAt", async () => {
      const olderSignal = makeSignal({
        dedupeKey: `signal:earthquake:test-provider:provider-native:order-old-${crypto.randomUUID()}`,
        title: "Older Signal",
        effectiveAt: new Date("2026-01-01T00:00:00Z").toISOString(),
      });
      const newerSignal = makeSignal({
        dedupeKey: `signal:earthquake:test-provider:provider-native:order-new-${crypto.randomUUID()}`,
        title: "Newer Signal",
        effectiveAt: new Date("2026-06-01T00:00:00Z").toISOString(),
      });
      await upsertSignal(db, olderSignal);
      await upsertSignal(db, newerSignal);

      const results = await querySignals(db, {
        since: new Date("2025-01-01"),
      });

      const olderIndex = results.findIndex((s) => s.title === "Older Signal");
      const newerIndex = results.findIndex((s) => s.title === "Newer Signal");

      expect(olderIndex).toBeLessThan(newerIndex);
    });
  });

  describe("querySignalFeed", () => {
    itIfDb("orders by severity priority then recency", async () => {
      const ts = (h: number) =>
        new Date(`2026-06-18T${h.toString().padStart(2, "0")}:00:00Z`).toISOString();
      const uuid = () => crypto.randomUUID();

      await upsertSignal(
        db,
        makeSignal({
          dedupeKey: `sf:ext-${uuid()}`,
          title: "Extreme",
          severity: "extreme",
          effectiveAt: ts(10),
        }),
      );
      await upsertSignal(
        db,
        makeSignal({
          dedupeKey: `sf:sev-${uuid()}`,
          title: "Severe",
          severity: "severe",
          effectiveAt: ts(11),
        }),
      );
      await upsertSignal(
        db,
        makeSignal({
          dedupeKey: `sf:mod-e-${uuid()}`,
          title: "Moderate Early",
          severity: "moderate",
          effectiveAt: ts(9),
        }),
      );
      await upsertSignal(
        db,
        makeSignal({
          dedupeKey: `sf:mod-l-${uuid()}`,
          title: "Moderate Late",
          severity: "moderate",
          effectiveAt: ts(12),
        }),
      );

      const results = await querySignalFeed(db, {
        category: "earthquake",
        since: new Date("2026-06-01"),
      });

      const titles = results
        .filter((s) => ["Extreme", "Severe", "Moderate Early", "Moderate Late"].includes(s.title))
        .map((s) => s.title);

      expect(titles).toEqual(["Extreme", "Severe", "Moderate Late", "Moderate Early"]);
    });

    itIfDb("filters by category", async () => {
      const uuid = () => crypto.randomUUID();
      await upsertSignal(
        db,
        makeSignal({
          dedupeKey: `sf-cat-eq-${uuid()}`,
          title: "Earthquake",
          category: "earthquake",
        }),
      );
      await upsertSignal(
        db,
        makeSignal({
          dedupeKey: `sf-cat-wx-${uuid()}`,
          title: "Weather",
          category: "weather",
        }),
      );

      const results = await querySignalFeed(db, {
        category: "weather",
        since: new Date("2026-06-01"),
      });

      expect(results.some((s) => s.title === "Weather")).toBe(true);
      expect(results.some((s) => s.title === "Earthquake")).toBe(false);
    });

    itIfDb("respects the since window", async () => {
      const uuid = () => crypto.randomUUID();
      await upsertSignal(
        db,
        makeSignal({
          dedupeKey: `sf-win-recent-${uuid()}`,
          title: "Recent",
          effectiveAt: new Date().toISOString(),
        }),
      );
      await upsertSignal(
        db,
        makeSignal({
          dedupeKey: `sf-win-old-${uuid()}`,
          title: "Old",
          effectiveAt: new Date("2020-01-01").toISOString(),
        }),
      );

      const results = await querySignalFeed(db, {
        category: "earthquake",
        since: new Date("2025-01-01"),
      });

      expect(results.some((s) => s.title === "Recent")).toBe(true);
      expect(results.some((s) => s.title === "Old")).toBe(false);
    });
  });

  describe("provider freshness", () => {
    it("returns empty array for empty input without hitting the database", async () => {
      const read = await queryProviderFreshness(db, []);
      expect(read).toEqual([]);
    });

    itIfDb("reads freshness for a list of (provider, category) keys", async () => {
      await upsertProviderFreshness(db, {
        provider: "usgs",
        category: "earthquake",
        lastSuccessfulPollAt: new Date("2026-06-01T12:00:00Z"),
      });
      await upsertProviderFreshness(db, {
        provider: "noaa-swpc",
        category: "space-weather",
        lastSuccessfulPollAt: new Date("2026-06-02T00:00:00Z"),
      });

      const read = await queryProviderFreshness(db, [
        { provider: "usgs", category: "earthquake" },
        { provider: "noaa-swpc", category: "space-weather" },
      ]);

      expect(read).toHaveLength(2);
      const usgs = read.find((r) => r.provider === "usgs");
      const swpc = read.find((r) => r.provider === "noaa-swpc");
      expect(usgs).toBeDefined();
      expect(usgs!.category).toBe("earthquake");
      expect(usgs!.lastSuccessfulPollAt.toISOString()).toBe("2026-06-01T12:00:00.000Z");
      expect(swpc).toBeDefined();
      expect(swpc!.category).toBe("space-weather");
      expect(swpc!.lastSuccessfulPollAt.toISOString()).toBe("2026-06-02T00:00:00.000Z");
    });

    itIfDb("omits keys with no matching row from the result", async () => {
      await upsertProviderFreshness(db, {
        provider: "usgs",
        category: "earthquake",
        lastSuccessfulPollAt: new Date("2026-06-01T00:00:00Z"),
      });

      const read = await queryProviderFreshness(db, [
        { provider: "usgs", category: "earthquake" },
        { provider: "nonexistent", category: "earthquake" },
      ]);

      expect(read).toHaveLength(1);
      expect(read[0].provider).toBe("usgs");
    });

    itIfDb("supports a single-key call (1-element array) for the feed route shape", async () => {
      await upsertProviderFreshness(db, {
        provider: "usgs",
        category: "earthquake",
        lastSuccessfulPollAt: new Date("2026-06-01T00:00:00Z"),
      });

      const read = await queryProviderFreshness(db, [
        { provider: "usgs", category: "earthquake" },
      ]);

      expect(read).toHaveLength(1);
      expect(read[0]).toEqual({
        provider: "usgs",
        category: "earthquake",
        lastSuccessfulPollAt: new Date("2026-06-01T00:00:00.000Z"),
      });
    });

    itIfDb("reflects upsert updates on the next read", async () => {
      await upsertProviderFreshness(db, {
        provider: "openweather",
        category: "weather",
        lastSuccessfulPollAt: new Date("2026-01-01T00:00:00Z"),
      });

      await upsertProviderFreshness(db, {
        provider: "openweather",
        category: "weather",
        lastSuccessfulPollAt: new Date("2026-06-15T00:00:00Z"),
      });

      const read = await queryProviderFreshness(db, [
        { provider: "openweather", category: "weather" },
      ]);
      expect(read[0].lastSuccessfulPollAt.toISOString()).toBe("2026-06-15T00:00:00.000Z");
    });
  });
});
