import { describe, expect, it } from "vitest";
import {
  defaultPlaceholderIntervalMs,
  defaultUsgsPollIntervalMs,
  maxIntervalMs,
  parsePlaceholderIntervalMs,
  parseUsgsPollIntervalMs,
  readDatabaseUrl,
  readUsgsPollIntervalMs,
} from "./config";

describe("placeholder interval", () => {
  it("uses a valid placeholder interval", () => {
    expect(parsePlaceholderIntervalMs("1000")).toBe(1000);
  });

  it("falls back when the interval is missing", () => {
    expect(parsePlaceholderIntervalMs(undefined)).toBe(defaultPlaceholderIntervalMs);
  });

  it("falls back when the interval is invalid", () => {
    expect(parsePlaceholderIntervalMs("soon")).toBe(defaultPlaceholderIntervalMs);
  });

  it("falls back when the interval is zero", () => {
    expect(parsePlaceholderIntervalMs("0")).toBe(defaultPlaceholderIntervalMs);
  });

  it("falls back when the interval is negative", () => {
    expect(parsePlaceholderIntervalMs("-1")).toBe(defaultPlaceholderIntervalMs);
  });

  it("falls back when the interval is above the timer maximum", () => {
    expect(parsePlaceholderIntervalMs(String(maxIntervalMs + 1))).toBe(
      defaultPlaceholderIntervalMs,
    );
  });
});

describe("database URL", () => {
  it("reads DATABASE_URL from env", () => {
    expect(readDatabaseUrl({ DATABASE_URL: "postgresql://localhost/mydb" })).toBe(
      "postgresql://localhost/mydb",
    );
  });

  it("returns empty string when DATABASE_URL is not set", () => {
    expect(readDatabaseUrl({})).toBe("");
  });

  it("returns empty string when DATABASE_URL is whitespace", () => {
    expect(readDatabaseUrl({ DATABASE_URL: "   " })).toBe("");
  });
});

describe("USGS poll interval", () => {
  it("uses a valid USGS poll interval", () => {
    expect(parseUsgsPollIntervalMs("60000")).toBe(60000);
  });

  it("falls back when the interval is missing", () => {
    expect(parseUsgsPollIntervalMs(undefined)).toBe(defaultUsgsPollIntervalMs);
  });

  it("falls back when the interval is invalid", () => {
    expect(parseUsgsPollIntervalMs("fast")).toBe(defaultUsgsPollIntervalMs);
  });

  it("falls back when the interval is zero", () => {
    expect(parseUsgsPollIntervalMs("0")).toBe(defaultUsgsPollIntervalMs);
  });

  it("falls back when the interval is above the timer maximum", () => {
    expect(parseUsgsPollIntervalMs(String(maxIntervalMs + 1))).toBe(defaultUsgsPollIntervalMs);
  });

  it("reads USGS_POLL_INTERVAL_MS from env", () => {
    expect(readUsgsPollIntervalMs({ USGS_POLL_INTERVAL_MS: "120000" })).toBe(120000);
  });
});
