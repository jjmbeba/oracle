import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { schema } from "@oracle/db";
import type { NormalizedSignal } from "@oracle/domain";
import { createUsgsIngestionJob } from "./usgs-ingestion";
import type { WorkerLogger } from "../logger";

type LogRecord = {
  event: string;
  error?: unknown;
  metadata?: Record<string, unknown>;
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

const validUsgsResponse = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      id: "usgs123",
      geometry: { type: "Point", coordinates: [-117.5, 35.7] },
      properties: {
        mag: 6.5,
        place: "Near Ridgecrest, CA",
        time: 1718000000000,
        updated: 1718000100000,
        url: "https://earthquake.usgs.gov/earthquakes/eventpage/usgs123",
      },
    },
  ],
};

const validUsgsSignal: NormalizedSignal = {
  provider: "usgs",
  dedupeKey: "signal:earthquake:usgs:provider-native:usgs123",
  providerEventId: "usgs123",
  category: "earthquake",
  title: "Near Ridgecrest, CA",
  severity: "severe",
  confidence: "high",
  effectiveAt: new Date(1718000000000).toISOString(),
  occurredAt: new Date(1718000000000).toISOString(),
  issuedAt: new Date(1718000100000).toISOString(),
  scope: { kind: "point", coordinates: [-117.5, 35.7] },
  sourceLink: {
    url: "https://earthquake.usgs.gov/earthquakes/eventpage/usgs123",
    label: "USGS Earthquake Page",
  },
};

vi.mock("../providers/usgs/normalizer", () => ({
  normalizeUsgsResponse: vi.fn(),
}));

vi.mock("../providers/usgs/fetch", () => ({
  fetchUsgsSignals: vi.fn(),
}));

vi.mock("@oracle/db", () => ({
  upsertSignal: vi.fn(),
  upsertProviderFreshness: vi.fn(),
}));

import { fetchUsgsSignals } from "../providers/usgs/fetch";
import { normalizeUsgsResponse } from "../providers/usgs/normalizer";
import { upsertSignal, upsertProviderFreshness } from "@oracle/db";

describe("usgs ingestion job", () => {
  let mockDb: PostgresJsDatabase<typeof schema>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {} as PostgresJsDatabase<typeof schema>;
  });

  it("registers with usgs-ingestion name and default interval", () => {
    const { logger } = createTestLogger();
    const job = createUsgsIngestionJob({ db: mockDb, logger });

    expect(job.name).toBe("usgs-ingestion");
    expect(job.intervalMs).toBe(300_000);
    expect(typeof job.run).toBe("function");
  });

  it("reads interval from env", () => {
    const { logger } = createTestLogger();
    const job = createUsgsIngestionJob({
      db: mockDb,
      logger,
      env: { USGS_POLL_INTERVAL_MS: "60000" },
    });

    expect(job.intervalMs).toBe(60000);
  });

  it("fetches, normalizes, upserts signals, and records freshness", async () => {
    vi.mocked(fetchUsgsSignals).mockResolvedValue({
      data: validUsgsResponse,
      response: { ok: true } as Response,
    });

    vi.mocked(normalizeUsgsResponse).mockReturnValue({
      signals: [validUsgsSignal],
      skipped: [],
    });

    vi.mocked(upsertSignal).mockResolvedValue(validUsgsSignal);
    vi.mocked(upsertProviderFreshness).mockResolvedValue({
      provider: "usgs",
      category: "earthquake",
      lastSuccessfulPollAt: new Date(),
    });

    const { logger } = createTestLogger();
    const job = createUsgsIngestionJob({ db: mockDb, logger });

    await job.run();

    expect(fetchUsgsSignals).toHaveBeenCalledTimes(1);
    expect(normalizeUsgsResponse).toHaveBeenCalledWith(validUsgsResponse);
    expect(upsertSignal).toHaveBeenCalledWith(mockDb, validUsgsSignal);
    expect(upsertProviderFreshness).toHaveBeenCalledTimes(1);
  });

  it("logs fetch failure without crashing", async () => {
    vi.mocked(fetchUsgsSignals).mockRejectedValue(new Error("USGS unreachable"));

    const { records, logger } = createTestLogger();
    const job = createUsgsIngestionJob({ db: mockDb, logger });

    await job.run();

    expect(fetchUsgsSignals).toHaveBeenCalledTimes(1);
    expect(normalizeUsgsResponse).not.toHaveBeenCalled();
    expect(upsertSignal).not.toHaveBeenCalled();
    expect(records.some((r) => r.event === "usgs.fetch.failed")).toBe(true);
  });

  it("logs upsert failures without crashing the job", async () => {
    vi.mocked(fetchUsgsSignals).mockResolvedValue({
      data: validUsgsResponse,
      response: { ok: true } as Response,
    });

    vi.mocked(normalizeUsgsResponse).mockReturnValue({
      signals: [validUsgsSignal],
      skipped: [],
    });

    vi.mocked(upsertSignal).mockRejectedValue(new Error("DB constraint violation"));

    const { records, logger } = createTestLogger();
    const job = createUsgsIngestionJob({ db: mockDb, logger });

    await job.run();

    expect(upsertSignal).toHaveBeenCalled();
    expect(
      records.some((r) => r.event === "usgs.upsert.failed"),
    ).toBe(true);
    expect(
      records.some((r) => r.event === "usgs.ingestion.complete"),
    ).toBe(true);
  });
});
