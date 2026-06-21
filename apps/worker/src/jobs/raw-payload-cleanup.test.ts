import { describe, expect, it } from "vitest";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { schema } from "@oracle/db";
import { createRawPayloadCleanupJob } from "./raw-payload-cleanup";
import type { WorkerLogFields, WorkerLogger } from "../logger";

type LogRecord = {
  event: string;
  jobName?: string;
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

describe("raw payload cleanup job", () => {
  const mockDb = {} as PostgresJsDatabase<typeof schema>;

  it("creates a job with the correct name and interval", () => {
    const { logger } = createTestLogger();
    const job = createRawPayloadCleanupJob({ db: mockDb, logger });

    expect(job.name).toBe("raw-payload-cleanup");
    expect(job.intervalMs).toBe(60 * 60 * 1000);
  });

  it("returns a job with a run function", () => {
    const { logger } = createTestLogger();
    const job = createRawPayloadCleanupJob({ db: mockDb, logger });

    expect(job.run).toEqual(expect.any(Function));
  });
});
