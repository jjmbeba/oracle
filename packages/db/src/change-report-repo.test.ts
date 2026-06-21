import { describe, expect, it, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { user } from "./auth-schema";
import { createDatabaseConnection } from "./index";
import { changeReport, watchedRegion } from "./app-schema";
import {
  upsertChangeReport,
  getLatestChangeReport,
  type ChangeReportRow,
} from "./change-report-repo";
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

function makeRow(overrides: Partial<ChangeReportRow> = {}): ChangeReportRow {
  return {
    id: `${crypto.randomUUID()}`,
    watchedRegionId: "test-wr-id",
    generatedAt: new Date(),
    newSignals: [],
    expiredSignals: [],
    severityChanges: [],
    riskMovement: null,
    ...overrides,
  };
}

describe("change report repo", () => {
  describe("upsertChangeReport", () => {
    itIfDb("inserts a new change report", async () => {
      const data = makeRow();
      await upsertChangeReport(db, data);

      const [row] = await db
        .select()
        .from(changeReport)
        .where(eq(changeReport.id, data.id));

      expect(row).toBeDefined();
      expect(row.newSignals).toEqual([]);
      expect(row.riskMovement).toBeNull();
    });

    itIfDb("updates existing change report with same id", async () => {
      const id = `update-${crypto.randomUUID()}`;
      await upsertChangeReport(db, makeRow({ id, newSignals: [], riskMovement: null }));
      await upsertChangeReport(db, makeRow({ id, newSignals: [{ dedupeKey: "a", severity: "severe", category: "earthquake", occurredAt: null }], riskMovement: { fromScore: 10, toScore: 60, fromLevel: "watch", toLevel: "critical" } }));

      const [row] = await db
        .select()
        .from(changeReport)
        .where(eq(changeReport.id, id));

      expect(row.newSignals).toHaveLength(1);
      expect(row.newSignals[0].dedupeKey).toBe("a");
      expect(row.riskMovement).toEqual({
        fromScore: 10,
        toScore: 60,
        fromLevel: "watch",
        toLevel: "critical",
      });
    });
  });

  describe("getLatestChangeReport", () => {
    itIfDb("returns the most recent change report for a watched region", async () => {
      const older = makeRow({ id: `older-${crypto.randomUUID()}`, generatedAt: new Date("2026-01-01T00:00:00Z") });
      const newer = makeRow({ id: `newer-${crypto.randomUUID()}`, generatedAt: new Date("2026-01-02T00:00:00Z") });
      await upsertChangeReport(db, older);
      await upsertChangeReport(db, newer);

      const latest = await getLatestChangeReport(db, "test-wr-id");

      expect(latest?.id).toBe(newer.id);
    });

    itIfDb("returns undefined when no change reports exist", async () => {
      const result = await getLatestChangeReport(db, "test-wr-id");

      expect(result).toBeUndefined();
    });
  });
});
