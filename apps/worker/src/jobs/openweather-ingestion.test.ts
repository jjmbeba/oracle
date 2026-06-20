import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { schema } from "@oracle/db";
import { createOpenweatherIngestionJob } from "./openweather-ingestion";
import type { WorkerLogger } from "../logger";

type LogRecord = {
  event: string;
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
      warn(event: string, fields: Record<string, unknown> = {}) {
        records.push({ event, ...fields });
      },
      error(event: string, fields: Record<string, unknown> = {}) {
        records.push({ event, ...fields });
      },
    },
  };
}

vi.mock("./create-ingestion-job", async () => {
  const actual =
    await vi.importActual<typeof import("./create-ingestion-job")>("./create-ingestion-job");
  return {
    ...actual,
    createIngestionJob: vi.fn(actual.createIngestionJob),
  };
});

import { createIngestionJob as mockedCreateIngestionJob } from "./create-ingestion-job";

vi.mock("../providers/openweather/fetch", () => ({
  fetchOpenweatherAlerts: vi.fn(async () => ({
    data: { alerts: [] },
    response: { ok: true } as Response,
  })),
}));

import { fetchOpenweatherAlerts } from "../providers/openweather/fetch";

vi.mock("../providers/openweather/normalizer", async () => {
  const actual = await vi.importActual<typeof import("../providers/openweather/normalizer")>(
    "../providers/openweather/normalizer",
  );
  return {
    ...actual,
    normalizeOpenweatherResponse: vi.fn(actual.normalizeOpenweatherResponse),
  };
});

import { normalizeOpenweatherResponse } from "../providers/openweather/normalizer";

describe("openweather ingestion job", () => {
  let mockDb: PostgresJsDatabase<typeof schema>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {} as PostgresJsDatabase<typeof schema>;
  });

  it("uses the factory with OpenWeather config and default interval", () => {
    const { logger } = createTestLogger();
    const job = createOpenweatherIngestionJob({
      db: mockDb,
      logger,
      env: { OPENWEATHER_API_KEY: "test-key" },
    });

    expect(job.name).toBe("openweather-ingestion");
    expect(job.intervalMs).toBe(600_000);
    expect(mockedCreateIngestionJob).toHaveBeenCalledTimes(1);
    const config = vi.mocked(mockedCreateIngestionJob).mock.calls[0]![0];
    expect(config).toMatchObject({
      name: "openweather-ingestion",
      provider: "openweather",
      category: "weather",
      logPrefix: "openweather",
      intervalMs: 600_000,
    });
    expect(typeof config.fetchData).toBe("function");
    expect(typeof config.normalize).toBe("function");
  });

  it("reads the interval from env", () => {
    const { logger } = createTestLogger();
    const job = createOpenweatherIngestionJob({
      db: mockDb,
      logger,
      env: {
        OPENWEATHER_API_KEY: "test-key",
        OPENWEATHER_POLL_INTERVAL_MS: "120000",
      },
    });

    expect(job.intervalMs).toBe(120_000);
    const config = vi.mocked(mockedCreateIngestionJob).mock.calls[0]![0];
    expect(config.intervalMs).toBe(120_000);
  });

  it("passes the api key from env into the fetcher", async () => {
    const { logger } = createTestLogger();
    const job = createOpenweatherIngestionJob({
      db: mockDb,
      logger,
      env: { OPENWEATHER_API_KEY: "test-key-123" },
    });

    const config = vi.mocked(mockedCreateIngestionJob).mock.calls[0]![0];
    await config.fetchData();
    expect(fetchOpenweatherAlerts).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: "test-key-123" }),
    );
    expect(job.name).toBe("openweather-ingestion");
  });

  it("normalizes fetched data through the OpenWeather response normalizer", async () => {
    const { logger } = createTestLogger();
    createOpenweatherIngestionJob({
      db: mockDb,
      logger,
      env: { OPENWEATHER_API_KEY: "test-key" },
    });

    const config = vi.mocked(mockedCreateIngestionJob).mock.calls[0]![0];
    const result = config.normalize({ alerts: [] });

    expect(normalizeOpenweatherResponse).toHaveBeenCalledWith({ alerts: [] });
    expect(result).toEqual({ signals: [], skipped: [] });
  });

  it("returns a no-op job when OPENWEATHER_API_KEY is missing", () => {
    const { logger, records } = createTestLogger();
    const job = createOpenweatherIngestionJob({ db: mockDb, logger });

    expect(job.name).toBe("openweather-ingestion");
    expect(job.intervalMs).toBe(600_000);
    expect(mockedCreateIngestionJob).not.toHaveBeenCalled();

    job.run();
    expect(records).toContainEqual(
      expect.objectContaining({ event: "openweather.skipped.no_api_key" }),
    );
  });
});
