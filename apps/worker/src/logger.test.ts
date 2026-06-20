import { describe, expect, it } from "vitest";
import { createWorkerLogger, serializeError } from "./logger";

describe("worker logger", () => {
  it("emits parseable JSON records with stable fields", () => {
    const messages: string[] = [];

    const logger = createWorkerLogger({
      sink: {
        info(message) {
          messages.push(message);
        },
        warn() {
          return;
        },
        error() {
          return;
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

  it("emits warn records at warn level", () => {
    const messages: string[] = [];

    const logger = createWorkerLogger({
      sink: {
        info() {
          return;
        },
        warn(message) {
          messages.push(message);
        },
        error() {
          return;
        },
      },
      now: () => new Date("2026-06-08T00:00:00.000Z"),
    });

    logger.warn("openweather.normalize.rejected", {
      jobName: "openweather-ingestion",
      metadata: {
        providerEventId: "1234567",
        reason: "schema-validation",
        issues: [{ path: "tags", message: "Required" }],
      },
    });

    expect(JSON.parse(messages[0] ?? "")).toEqual({
      timestamp: "2026-06-08T00:00:00.000Z",
      level: "warn",
      service: "worker",
      event: "openweather.normalize.rejected",
      jobName: "openweather-ingestion",
      metadata: {
        providerEventId: "1234567",
        reason: "schema-validation",
        issues: [{ path: "tags", message: "Required" }],
      },
    });
  });

  it("serializes errors predictably", () => {
    const errors: string[] = [];
    const logger = createWorkerLogger({
      sink: {
        info() {
          return;
        },
        warn() {
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

  it("serializes attached url, errorLabel, and status from fetch errors", () => {
    const errors: string[] = [];
    const logger = createWorkerLogger({
      sink: {
        info() {
          return;
        },
        warn() {
          return;
        },
        error(message) {
          errors.push(message);
        },
      },
      now: () => new Date("2026-06-08T00:00:00.000Z"),
    });

    const fetchError = new TypeError("fetch failed");
    Object.assign(fetchError, {
      url: "https://api.openweathermap.org/data/4.0/onecall/alert/abc?appid=k",
      errorLabel: "OpenWeather API",
      status: undefined,
    });

    logger.error("openweather.fetch.failed", {
      jobName: "openweather-ingestion",
      error: fetchError,
    });

    expect(JSON.parse(errors[0] ?? "")).toMatchObject({
      level: "error",
      event: "openweather.fetch.failed",
      error: {
        name: "TypeError",
        message: "fetch failed",
        url: "https://api.openweathermap.org/data/4.0/onecall/alert/abc?appid=k",
        errorLabel: "OpenWeather API",
      },
    });
  });

  it("serializes attached status for HTTP errors", () => {
    const serialized = serializeError(
      (() => {
        const err = new Error("OpenWeather API returned 401 Unauthorized for https://x");
        Object.assign(err, { url: "https://x", errorLabel: "OpenWeather API", status: 401 });
        return err;
      })(),
    );

    expect(serialized.status).toBe(401);
    expect(serialized.url).toBe("https://x");
    expect(serialized.errorLabel).toBe("OpenWeather API");
  });

  it("ignores non-string url/errorLabel and non-number status when serializing", () => {
    const err = new Error("boom");
    Object.assign(err, { url: 123, errorLabel: null, status: "500" });
    const serialized = serializeError(err);
    expect(serialized.url).toBeUndefined();
    expect(serialized.errorLabel).toBeUndefined();
    expect(serialized.status).toBeUndefined();
  });

  it("sanitizes circular metadata", () => {
    const messages: string[] = [];
    const logger = createWorkerLogger({
      sink: {
        info(message) {
          messages.push(message);
        },
        warn() {
          return;
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
        warn() {
          return;
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
        warn() {
          return;
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
