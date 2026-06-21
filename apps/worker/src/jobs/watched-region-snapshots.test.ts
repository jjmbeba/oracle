import { beforeEach, describe, expect, it } from "vitest";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { schema } from "@oracle/db";
import { createWatchedRegionSnapshotJob } from "./watched-region-snapshots";
import type { WorkerLogFields, WorkerLogger } from "../logger";

type LogRecord = {
  event: string;
  jobName?: string;
  durationMs?: number;
  error?: unknown;
  metadata?: Record<string, unknown>;
};

function createTestLogger(): { records: LogRecord[]; logger: WorkerLogger } {
  const records: LogRecord[] = [];
  return {
    records,
    logger: {
      info(event: string, fields: WorkerLogFields = {}) {
        records.push({ event, ...fields });
      },
      warn(event: string, fields: WorkerLogFields = {}) {
        records.push({ event, ...fields });
      },
      error(event: string, fields: WorkerLogFields = {}) {
        records.push({ event, ...fields });
      },
    },
  };
}

describe("watched region snapshot job", () => {
  let mockDb: PostgresJsDatabase<typeof schema>;

  beforeEach(() => {
    mockDb = {} as PostgresJsDatabase<typeof schema>;
  });

  it("creates a job with the correct name and interval", () => {
    const { logger } = createTestLogger();
    const job = createWatchedRegionSnapshotJob({ db: mockDb, logger });

    expect(job.name).toBe("watched-region-snapshots");
    expect(job.intervalMs).toBe(5 * 60 * 1000);
  });

  it("returns a job with a run function", () => {
    const { logger } = createTestLogger();
    const job = createWatchedRegionSnapshotJob({ db: mockDb, logger });

    expect(job.run).toEqual(expect.any(Function));
  });
});
