import { describe, expect, it } from "vitest";
import { defaultPlaceholderIntervalMs, maxIntervalMs, parsePlaceholderIntervalMs } from "./config";

describe("worker config", () => {
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
