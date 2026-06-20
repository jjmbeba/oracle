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

    await scheduler.registerIntervalJob({
      name: "placeholder",
      intervalMs: 1000,
      run,
    });

    expect(run).toHaveBeenCalledTimes(1);
    expect(records).toEqual([
      {
        event: "job.success",
        jobName: "placeholder",
        durationMs: 0,
      },
    ]);

    await vi.advanceTimersByTimeAsync(1000);
    await Promise.resolve();
    await Promise.resolve();

    expect(run).toHaveBeenCalledTimes(2);
    expect(records).toHaveLength(2);

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

    await scheduler.registerIntervalJob({
      name: "placeholder",
      intervalMs: 1000,
      run,
    });

    expect(records.map((record) => record.event)).toEqual(["job.failure"]);

    await vi.advanceTimersByTimeAsync(1000);
    await Promise.resolve();
    await Promise.resolve();

    expect(records.map((record) => record.event)).toEqual(["job.failure", "job.success"]);

    await vi.advanceTimersByTimeAsync(1000);
    await Promise.resolve();
    await Promise.resolve();

    expect(run).toHaveBeenCalledTimes(3);
    expect(records.map((record) => record.event)).toEqual([
      "job.failure",
      "job.success",
      "job.success",
    ]);

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

    await Promise.resolve();
    await Promise.resolve();

    await vi.advanceTimersByTimeAsync(1000);
    await Promise.resolve();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(1000);
    await Promise.resolve();
    await Promise.resolve();

    expect(run).toHaveBeenCalledTimes(1);
    expect(records).toEqual([
      {
        event: "job.skipped",
        jobName: "placeholder",
      },
      {
        event: "job.skipped",
        jobName: "placeholder",
      },
    ]);

    resolveRun?.();
    await Promise.resolve();
    await Promise.resolve();
    await scheduler.stop();
  });

  it("clears timers on stop", async () => {
    vi.useFakeTimers();
    const { logger } = createTestLogger();
    const run = vi.fn();
    const scheduler = createScheduler({ logger });

    await scheduler.registerIntervalJob({
      name: "placeholder",
      intervalMs: 1000,
      run,
    });

    await scheduler.stop();

    expect(run).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);

    expect(run).toHaveBeenCalledTimes(1);
  });

  it("rejects duplicate job names", async () => {
    vi.useFakeTimers();
    const { logger } = createTestLogger();
    const scheduler = createScheduler({ logger });

    await scheduler.registerIntervalJob({
      name: "placeholder",
      intervalMs: 1000,
      run: vi.fn(),
    });

    expect(() => {
      scheduler.registerIntervalJob({
        name: "placeholder",
        intervalMs: 2000,
        run: vi.fn(),
      });
    }).toThrow("Scheduled job already registered: placeholder");

    await scheduler.stop();
  });
});
