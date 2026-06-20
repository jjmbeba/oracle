import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { schema } from "@oracle/db";
import type { NormalizedSignal } from "@oracle/domain";
import { createIngestionJob } from "./create-ingestion-job";
import type { ProviderFetcher, ProviderNormalizer } from "./create-ingestion-job";
import type { JsonFetchResult } from "../providers/fetch-json";
import type { WorkerLogger } from "../logger";

type LogRecord = {
  event: string;
  error?: unknown;
  metadata?: Record<string, unknown>;
  jobName?: string;
};

function createTestLogger(): { records: LogRecord[]; logger: WorkerLogger } {
  const records: LogRecord[] = [];
  return {
    records,
    logger: {
      info(event: string, fields: Record<string, unknown> = {}) {
        records.push({ event, ...fields });
      },
      error(event: string, fields: Record<string, unknown> = {}) {
        records.push({ event, ...fields });
      },
    },
  };
}

const validSignal: NormalizedSignal = {
  provider: "test-provider",
  dedupeKey: "signal:test:test-provider:provider-native:test",
  providerEventId: "test",
  category: "earthquake",
  title: "Test Signal",
  severity: "moderate",
  confidence: "high",
  effectiveAt: new Date("2026-06-13T00:00:00.000Z").toISOString(),
  scope: { kind: "global" },
};

vi.mock("@oracle/db", () => ({
  upsertSignal: vi.fn(),
  upsertProviderFreshness: vi.fn(),
}));

import { upsertSignal, upsertProviderFreshness } from "@oracle/db";

function buildConfig(
  overrides: Partial<{
    name: string;
    provider: string;
    category: "earthquake" | "weather" | "space-weather";
    fetchData: ProviderFetcher;
    normalize: ProviderNormalizer;
    logPrefix: string;
    intervalMs: number;
  }> = {},
) {
  return {
    name: overrides.name ?? "test-ingestion",
    provider: overrides.provider ?? "test-provider",
    category: overrides.category ?? ("earthquake" as const),
    fetchData:
      overrides.fetchData ??
      (async (): Promise<JsonFetchResult> => ({
        data: { ok: true },
        response: { ok: true } as Response,
      })),
    normalize: overrides.normalize ?? (() => ({ signals: [validSignal], skipped: [] })),
    logPrefix: overrides.logPrefix ?? "test",
    intervalMs: overrides.intervalMs ?? 60_000,
  };
}

describe("createIngestionJob", () => {
  let mockDb: PostgresJsDatabase<typeof schema>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {} as PostgresJsDatabase<typeof schema>;
  });

  it("registers with the config-provided name and interval", () => {
    const { logger } = createTestLogger();
    const job = createIngestionJob(buildConfig({ name: "x-ingestion", intervalMs: 12_345 }), {
      db: mockDb,
      logger,
    });

    expect(job.name).toBe("x-ingestion");
    expect(job.intervalMs).toBe(12_345);
    expect(typeof job.run).toBe("function");
  });

  it("fetches, normalizes, upserts signals, and records freshness", async () => {
    const fetchData = vi.fn(
      async (): Promise<JsonFetchResult> => ({
        data: { anything: 1 },
        response: { ok: true } as Response,
      }),
    );
    const normalize = vi.fn(() => ({ signals: [validSignal], skipped: [{ id: "skipped" }] }));

    vi.mocked(upsertSignal).mockResolvedValue(validSignal);
    vi.mocked(upsertProviderFreshness).mockResolvedValue({
      provider: "test-provider",
      category: "earthquake",
      lastSuccessfulPollAt: new Date(),
    });

    const { logger, records } = createTestLogger();
    const job = createIngestionJob(buildConfig({ fetchData, normalize }), { db: mockDb, logger });

    await job.run();

    expect(fetchData).toHaveBeenCalledTimes(1);
    expect(normalize).toHaveBeenCalledWith({ anything: 1 });
    expect(upsertSignal).toHaveBeenCalledWith(mockDb, validSignal);
    expect(upsertProviderFreshness).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        provider: "test-provider",
        category: "earthquake",
        lastSuccessfulPollAt: expect.any(Date),
      }),
    );

    const events = records.map((r) => r.event);
    expect(events).toContain("test.normalized");
    expect(events).toContain("test.ingestion.complete");

    const complete = records.find((r) => r.event === "test.ingestion.complete");
    expect(complete?.metadata).toEqual({
      upsertedCount: 1,
      skippedCount: 1,
    });
  });

  it("logs fetch failure without crashing", async () => {
    const fetchData = vi.fn(async () => {
      throw new Error("network down");
    });

    const { logger, records } = createTestLogger();
    const job = createIngestionJob(buildConfig({ fetchData }), { db: mockDb, logger });

    await job.run();

    expect(fetchData).toHaveBeenCalledTimes(1);
    expect(upsertSignal).not.toHaveBeenCalled();
    expect(upsertProviderFreshness).not.toHaveBeenCalled();
    expect(records.some((r) => r.event === "test.fetch.failed")).toBe(true);
  });

  it("logs normalize failure without crashing", async () => {
    const fetchData = vi.fn(
      async (): Promise<JsonFetchResult> => ({
        data: { invalid: true },
        response: { ok: true } as Response,
      }),
    );
    const normalize = vi.fn(() => {
      throw new Error("schema validation failed");
    });

    const { logger, records } = createTestLogger();
    const job = createIngestionJob(buildConfig({ fetchData, normalize }), { db: mockDb, logger });

    await job.run();

    expect(normalize).toHaveBeenCalledTimes(1);
    expect(upsertSignal).not.toHaveBeenCalled();
    expect(upsertProviderFreshness).not.toHaveBeenCalled();
    expect(records.some((r) => r.event === "test.normalize.failed")).toBe(true);
  });

  it("continues upsert loop when one signal fails and still records freshness", async () => {
    const fetchData = vi.fn(
      async (): Promise<JsonFetchResult> => ({
        data: {},
        response: { ok: true } as Response,
      }),
    );
    const signals = [
      { ...validSignal, dedupeKey: "signal:test:test-provider:provider-native:a" },
      { ...validSignal, dedupeKey: "signal:test:test-provider:provider-native:b" },
    ];
    const normalize = vi.fn(() => ({ signals, skipped: [] }));

    vi.mocked(upsertSignal)
      .mockRejectedValueOnce(new Error("constraint violation"))
      .mockResolvedValueOnce(validSignal);
    vi.mocked(upsertProviderFreshness).mockResolvedValue({
      provider: "test-provider",
      category: "earthquake",
      lastSuccessfulPollAt: new Date(),
    });

    const { logger, records } = createTestLogger();
    const job = createIngestionJob(buildConfig({ fetchData, normalize }), { db: mockDb, logger });

    await job.run();

    expect(upsertSignal).toHaveBeenCalledTimes(2);
    expect(upsertProviderFreshness).toHaveBeenCalledTimes(1);
    expect(records.some((r) => r.event === "test.upsert.failed")).toBe(true);
    expect(records.some((r) => r.event === "test.ingestion.complete")).toBe(true);

    const complete = records.find((r) => r.event === "test.ingestion.complete");
    expect(complete?.metadata).toEqual({
      upsertedCount: 1,
      skippedCount: 0,
    });
  });

  it("logs freshness failure without aborting the job", async () => {
    const fetchData = vi.fn(
      async (): Promise<JsonFetchResult> => ({
        data: {},
        response: { ok: true } as Response,
      }),
    );
    const normalize = vi.fn(() => ({ signals: [validSignal], skipped: [] }));

    vi.mocked(upsertSignal).mockResolvedValue(validSignal);
    vi.mocked(upsertProviderFreshness).mockRejectedValue(new Error("freshness write failed"));

    const { logger, records } = createTestLogger();
    const job = createIngestionJob(buildConfig({ fetchData, normalize }), { db: mockDb, logger });

    await job.run();

    expect(records.some((r) => r.event === "test.freshness.failed")).toBe(true);
    expect(records.some((r) => r.event === "test.ingestion.complete")).toBe(true);
  });

  it("passes the configured provider and category into the freshness call", async () => {
    const fetchData = vi.fn(
      async (): Promise<JsonFetchResult> => ({
        data: {},
        response: { ok: true } as Response,
      }),
    );
    const normalize = vi.fn(() => ({ signals: [], skipped: [] }));

    vi.mocked(upsertProviderFreshness).mockResolvedValue({
      provider: "noaa-swpc",
      category: "space-weather",
      lastSuccessfulPollAt: new Date(),
    });

    const { logger } = createTestLogger();
    const job = createIngestionJob(
      buildConfig({
        provider: "noaa-swpc",
        category: "space-weather",
        fetchData,
        normalize,
      }),
      { db: mockDb, logger },
    );

    await job.run();

    expect(upsertProviderFreshness).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        provider: "noaa-swpc",
        category: "space-weather",
      }),
    );
  });
});
