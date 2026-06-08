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
});
