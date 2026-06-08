import { describe, expect, it } from "vitest";
import { createWorkerLogger } from "./logger";

describe("worker logger", () => {
  it("emits parseable JSON records with stable fields", () => {
    const messages: string[] = [];

    const logger = createWorkerLogger({
      sink: {
        info(message) {
          messages.push(message);
        },
        error(message) {
          messages.push(message);
        },
      },
      now: () => new Date("2026-06-08T00:00:00.000Z"),
    });

    logger.info("job.success", {
      jobName: "placeholder",
      durationMs: 12,
      metadata: { intervalMs: 5000 },
    });

    expect(JSON.parse(messages[0] ?? "")).toEqual({
      timestamp: "2026-06-08T00:00:00.000Z",
      level: "info",
      service: "worker",
      event: "job.success",
      jobName: "placeholder",
      durationMs: 12,
      metadata: { intervalMs: 5000 },
    });
  });

  it("serializes errors predictably", () => {
    const errors: string[] = [];
    const logger = createWorkerLogger({
      sink: {
        info() {
          return;
        },
        error(message) {
          errors.push(message);
        },
      },
      now: () => new Date("2026-06-08T00:00:00.000Z"),
    });

    logger.error("job.failure", {
      jobName: "placeholder",
      error: new Error("boom"),
    });

    expect(JSON.parse(errors[0] ?? "")).toMatchObject({
      timestamp: "2026-06-08T00:00:00.000Z",
      level: "error",
      service: "worker",
      event: "job.failure",
      jobName: "placeholder",
      error: {
        name: "Error",
        message: "boom",
      },
    });
  });

  it("sanitizes circular metadata", () => {
    const messages: string[] = [];
    const logger = createWorkerLogger({
      sink: {
        info(message) {
          messages.push(message);
        },
        error() {
          return;
        },
      },
      now: () => new Date("2026-06-08T00:00:00.000Z"),
    });
    const metadata: Record<string, unknown> = { job: "placeholder" };
    metadata.self = metadata;

    logger.info("job.success", { metadata });

    expect(JSON.parse(messages[0] ?? "")).toMatchObject({
      metadata: {
        job: "placeholder",
        self: "[Circular]",
      },
    });
  });

  it("sanitizes bigint metadata", () => {
    const messages: string[] = [];
    const logger = createWorkerLogger({
      sink: {
        info(message) {
          messages.push(message);
        },
        error() {
          return;
        },
      },
      now: () => new Date("2026-06-08T00:00:00.000Z"),
    });

    logger.info("job.success", {
      metadata: {
        count: 9007199254740993n,
      },
    });

    expect(JSON.parse(messages[0] ?? "")).toMatchObject({
      metadata: {
        count: "9007199254740993",
      },
    });
  });

  it("falls back when metadata cannot be serialized", () => {
    const messages: string[] = [];
    const logger = createWorkerLogger({
      sink: {
        info(message) {
          messages.push(message);
        },
        error() {
          return;
        },
      },
      now: () => new Date("2026-06-08T00:00:00.000Z"),
    });

    logger.info("job.success", {
      metadata: {
        bad: {
          toJSON() {
            throw new Error("cannot serialize");
          },
        },
      },
    });

    expect(JSON.parse(messages[0] ?? "")).toMatchObject({
      metadata: {
        unserializable: true,
      },
    });
  });
});
