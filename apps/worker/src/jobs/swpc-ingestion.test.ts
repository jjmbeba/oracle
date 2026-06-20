import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { schema } from "@oracle/db";
import { createSwpcIngestionJob } from "./swpc-ingestion";
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

describe("swpc ingestion job", () => {
  let mockDb: PostgresJsDatabase<typeof schema>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {} as PostgresJsDatabase<typeof schema>;
  });

  it("uses the factory with SWPC config and default interval", () => {
    const { logger } = createTestLogger();
    const job = createSwpcIngestionJob({ db: mockDb, logger });

    expect(job.name).toBe("swpc-ingestion");
    expect(job.intervalMs).toBe(600_000);
    expect(mockedCreateIngestionJob).toHaveBeenCalledTimes(1);
    const config = vi.mocked(mockedCreateIngestionJob).mock.calls[0]![0];
    expect(config).toMatchObject({
      name: "swpc-ingestion",
      provider: "noaa-swpc",
      category: "space-weather",
      logPrefix: "swpc",
      intervalMs: 600_000,
    });
    expect(typeof config.fetchData).toBe("function");
    expect(typeof config.normalize).toBe("function");
  });

  it("reads the interval from env", () => {
    const { logger } = createTestLogger();
    const job = createSwpcIngestionJob({
      db: mockDb,
      logger,
      env: { SWPC_POLL_INTERVAL_MS: "120000" },
    });

    expect(job.intervalMs).toBe(120_000);
    const config = vi.mocked(mockedCreateIngestionJob).mock.calls[0]![0];
    expect(config.intervalMs).toBe(120_000);
  });
});
