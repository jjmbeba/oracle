import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import type { Scheduler } from "./scheduler";
import { startWorker, type SignalSource, type WorkerSignal } from "./worker";

type WorkerEventRecord = {
  event: string;
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

describe("worker runtime", () => {
  it("registers the placeholder job and logs startup", () => {
    const { logger, records } = createTestLogger();
    const scheduler: Scheduler = {
      registerIntervalJob: vi.fn(),
      stop: vi.fn(),
    };

    startWorker({
      env: { WORKER_PLACEHOLDER_INTERVAL_MS: "2500" },
      logger,
      scheduler,
      signals: new SignalEmitter(),
    });

    expect(scheduler.registerIntervalJob).toHaveBeenCalledWith({
      name: "placeholder",
      intervalMs: 2500,
      run: expect.any(Function),
    });
    expect(records).toEqual([
      {
        event: "worker.started",
        metadata: {
          placeholderIntervalMs: 2500,
        },
      },
    ]);
  });

  it("stops the scheduler and logs shutdown lifecycle", async () => {
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

    startWorker({
      logger,
      scheduler,
      signals,
    });

    signals.emit("SIGTERM");
    await Promise.resolve();

    expect(records.map((record) => record.event)).toEqual([
      "worker.started",
      "worker.shutdown.started",
    ]);

    resolveStop?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(records.map((record) => record.event)).toEqual([
      "worker.started",
      "worker.shutdown.started",
      "worker.shutdown.completed",
    ]);
  });
});
