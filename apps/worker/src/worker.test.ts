import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import type { Scheduler } from "./scheduler";
import { handleSignalShutdown, startWorker, type SignalSource, type WorkerSignal } from "./worker";

type WorkerEventRecord = {
  event: string;
  error?: unknown;
  metadata?: Record<string, unknown>;
};

class SignalEmitter extends EventEmitter implements SignalSource {
  once(event: WorkerSignal, listener: () => void): this {
    return super.once(event, listener);
  }
}

function createTestLogger() {
  const records: WorkerEventRecord[] = [];

  return {
    records,
    logger: {
      info(event: string, fields: Omit<WorkerEventRecord, "event"> = {}) {
        records.push({ event, ...fields });
      },
      error(event: string, fields: Omit<WorkerEventRecord, "event"> = {}) {
        records.push({ event, ...fields });
      },
    },
  };
}

const testDbEnv = { DATABASE_URL: "postgresql://localhost:5432/test" };

describe("worker runtime", () => {
  it("registers the usgs, swpc, and openweather ingestion jobs and logs startup", () => {
    const { logger, records } = createTestLogger();
    const scheduler: Scheduler = {
      registerIntervalJob: vi.fn(),
      stop: vi.fn(),
    };

    startWorker({
      env: {
        ...testDbEnv,
        USGS_POLL_INTERVAL_MS: "300000",
        SWPC_POLL_INTERVAL_MS: "600000",
        OPENWEATHER_POLL_INTERVAL_MS: "600000",
        OPENWEATHER_API_KEY: "test-key",
      },
      logger,
      scheduler,
      signals: new SignalEmitter(),
    });

    expect(scheduler.registerIntervalJob).toHaveBeenCalledTimes(3);
    expect(scheduler.registerIntervalJob).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        name: "usgs-ingestion",
        intervalMs: 300000,
      }),
    );
    expect(scheduler.registerIntervalJob).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        name: "swpc-ingestion",
        intervalMs: 600000,
      }),
    );
    expect(scheduler.registerIntervalJob).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        name: "openweather-ingestion",
        intervalMs: 600000,
      }),
    );
    expect(records).toEqual([
      {
        event: "worker.started",
        metadata: {
          usgsPollIntervalMs: 300000,
          swpcPollIntervalMs: 600000,
          openweatherPollIntervalMs: 600000,
          openweatherApiKeyConfigured: true,
        },
      },
    ]);
  });

  it("logs openweatherApiKeyConfigured as false when the key is missing", () => {
    const { logger, records } = createTestLogger();
    const scheduler: Scheduler = {
      registerIntervalJob: vi.fn(),
      stop: vi.fn(),
    };

    startWorker({
      env: testDbEnv,
      logger,
      scheduler,
      signals: new SignalEmitter(),
    });

    const started = records.find((r) => r.event === "worker.started");
    expect(started?.metadata?.openweatherApiKeyConfigured).toBe(false);
  });

  it("stops the scheduler and logs direct shutdown lifecycle", async () => {
    const { logger, records } = createTestLogger();
    let resolveStop: (() => void) | undefined;
    const scheduler: Scheduler = {
      registerIntervalJob: vi.fn(),
      stop: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveStop = resolve;
          }),
      ),
    };
    const signals = new SignalEmitter();

    const runtime = startWorker({
      env: testDbEnv,
      logger,
      scheduler,
      signals,
    });

    const shutdown = runtime.shutdown();
    await Promise.resolve();

    expect(records.map((record) => record.event)).toEqual([
      "worker.started",
      "worker.shutdown.started",
    ]);

    resolveStop?.();
    await shutdown;

    expect(records.map((record) => record.event)).toEqual([
      "worker.started",
      "worker.shutdown.started",
      "worker.shutdown.completed",
    ]);
  });

  it("propagates scheduler stop failures during direct shutdown", async () => {
    const { logger } = createTestLogger();
    const error = new Error("stop failed");
    const scheduler: Scheduler = {
      registerIntervalJob: vi.fn(),
      stop: vi.fn(() => Promise.reject(error)),
    };
    const runtime = startWorker({
      env: testDbEnv,
      logger,
      scheduler,
      signals: new SignalEmitter(),
    });

    await expect(runtime.shutdown()).rejects.toThrow(error);
  });

  it("exits zero after successful signal shutdown", async () => {
    const { logger } = createTestLogger();
    const exitProcess = vi.fn();

    await handleSignalShutdown({
      shutdown: vi.fn(() => Promise.resolve()),
      logger,
      exitProcess,
    });

    expect(exitProcess).toHaveBeenCalledWith(0);
  });

  it("logs failure and exits one after failed signal shutdown", async () => {
    const { logger, records } = createTestLogger();
    const exitProcess = vi.fn();
    const error = new Error("stop failed");

    await handleSignalShutdown({
      shutdown: vi.fn(() => Promise.reject(error)),
      logger,
      exitProcess,
    });

    expect(records).toEqual([
      {
        event: "worker.shutdown.failed",
        error,
      },
    ]);
    expect(exitProcess).toHaveBeenCalledWith(1);
  });
});
