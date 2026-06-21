import { describe, expect, it, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { user } from "./auth-schema";
import { createDatabaseConnection } from "./index";
import { watchedRegion, watchedRegionSnapshot } from "./app-schema";
import { upsertWatchedRegionSnapshot, type WatchedRegionSnapshot } from "./snapshot-repo";
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
  await db.insert(user).values({
    id: "test-user-id",
    name: "test",
    email: "test@example.com",
  });
  await db.insert(watchedRegion).values({
    id: "test-wr-id",
    userId: "test-user-id",
    regionId: "test-region",
    createdAt: new Date(),
  });
});

afterEach(async () => {
  if (!db) return;
  await db.execute(sql`ROLLBACK`);
});

function makeSnapshot(overrides: Partial<WatchedRegionSnapshot> = {}): WatchedRegionSnapshot {
  return {
    id: `test:${crypto.randomUUID()}`,
    watchedRegionId: "test-wr-id",
    takenAt: new Date(),
    riskScore: 0,
    riskLevel: "quiet",
    worstSeverity: null,
    contributingSignals: 0,
    signals: [],
    ...overrides,
  };
}

describe("watched region snapshot repo", () => {
  describe("upsertWatchedRegionSnapshot", () => {
    itIfDb("inserts a new snapshot", async () => {
      const data = makeSnapshot({ id: `insert-${crypto.randomUUID()}` });
      await upsertWatchedRegionSnapshot(db, data);

      const [row] = await db
        .select()
        .from(watchedRegionSnapshot)
        .where(eq(watchedRegionSnapshot.id, data.id));

      expect(row).toBeDefined();
      expect(row.riskScore).toBe(0);
      expect(row.riskLevel).toBe("quiet");
    });

    itIfDb("updates existing snapshot with same id", async () => {
      const id = `update-${crypto.randomUUID()}`;

      await upsertWatchedRegionSnapshot(
        db,
        makeSnapshot({ id, riskScore: 5, riskLevel: "watch" }),
      );
      await upsertWatchedRegionSnapshot(
        db,
        makeSnapshot({ id, riskScore: 60, riskLevel: "critical" }),
      );

      const [row] = await db
        .select()
        .from(watchedRegionSnapshot)
        .where(eq(watchedRegionSnapshot.id, id));

      expect(row.riskScore).toBe(60);
      expect(row.riskLevel).toBe("critical");
    });

    itIfDb("stores signals JSONB correctly", async () => {
      const id = `signals-${crypto.randomUUID()}`;

      await upsertWatchedRegionSnapshot(
        db,
        makeSnapshot({
          id,
          signals: [
            {
              dedupeKey: "test:signal:1",
              severity: "severe",
              category: "earthquake",
              occurredAt: "2026-06-01T00:00:00.000Z",
            },
          ],
        }),
      );

      const [row] = await db
        .select()
        .from(watchedRegionSnapshot)
        .where(eq(watchedRegionSnapshot.id, id));

      expect(row.signals).toEqual([
        {
          dedupeKey: "test:signal:1",
          severity: "severe",
          category: "earthquake",
          occurredAt: "2026-06-01T00:00:00.000Z",
        },
      ]);
    });
  });
});
