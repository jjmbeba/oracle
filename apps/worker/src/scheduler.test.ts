import { afterEach, describe, expect, it, vi } from "vitest";
import { createScheduler } from "./scheduler";

type LogRecord = {
  event: string;
  jobName?: string;
  durationMs?: number;
  error?: unknown;
};

function createTestLogger() {
  const records: LogRecord[] = [];

  return {
    records,
    logger: {
      info(event: string, fields: Omit<LogRecord, "event"> = {}) {
        records.push({ event, ...fields });
      },
      error(event: string, fields: Omit<LogRecord, "event"> = {}) {
        records.push({ event, ...fields });
      },
    },
  };
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("worker scheduler", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs a registered job on its interval and logs success", async () => {
    vi.useFakeTimers();

    const { logger, records } = createTestLogger();
    const run = vi.fn();
    
    const scheduler = createScheduler({
      logger,
      now: () => 25,
    });

    scheduler.registerIntervalJob({
      name: "placeholder",
      intervalMs: 1000,
      run,
    });

    await vi.advanceTimersByTimeAsync(1000);
    await flushPromises();

    expect(run).toHaveBeenCalledTimes(1);
    expect(records).toEqual([
      {
        event: "job.success",
        jobName: "placeholder",
        durationMs: 0,
      },
    ]);

    await scheduler.stop();
  });

  it("logs failure without stopping future ticks", async () => {
    vi.useFakeTimers();
    const { logger, records } = createTestLogger();
    const run = vi
      .fn<() => Promise<void> | void>()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(undefined);
    const scheduler = createScheduler({ logger });

    scheduler.registerIntervalJob({
      name: "placeholder",
      intervalMs: 1000,
      run,
    });

    await vi.advanceTimersByTimeAsync(1000);
    await flushPromises();
    await vi.advanceTimersByTimeAsync(1000);
    await flushPromises();

    expect(run).toHaveBeenCalledTimes(2);
    expect(records.map((record) => record.event)).toEqual(["job.failure", "job.success"]);

    await scheduler.stop();
  });

  it("skips overlapping runs instead of queueing them", async () => {
    vi.useFakeTimers();
    const { logger, records } = createTestLogger();
    let resolveRun: (() => void) | undefined;
    const run = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRun = resolve;
        }),
    );
    const scheduler = createScheduler({ logger });

    scheduler.registerIntervalJob({
      name: "placeholder",
      intervalMs: 1000,
      run,
    });

    await vi.advanceTimersByTimeAsync(1000);
    await flushPromises();
    await vi.advanceTimersByTimeAsync(1000);
    await flushPromises();

    expect(run).toHaveBeenCalledTimes(1);
    expect(records).toEqual([
      {
        event: "job.skipped",
        jobName: "placeholder",
      },
    ]);

    resolveRun?.();
    await flushPromises();
    await scheduler.stop();
  });

  it("clears timers on stop", async () => {
    vi.useFakeTimers();
    const { logger } = createTestLogger();
    const run = vi.fn();
    const scheduler = createScheduler({ logger });

    scheduler.registerIntervalJob({
      name: "placeholder",
      intervalMs: 1000,
      run,
    });

    await scheduler.stop();
    vi.advanceTimersByTime(1000);

    expect(run).not.toHaveBeenCalled();
  });
});
