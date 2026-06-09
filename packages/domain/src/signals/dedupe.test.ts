import { describe, expect, it } from "vitest";
import { createSignalDedupeMetadata } from "./index";

describe("signal dedupe metadata", () => {
  it("builds stable provider-native dedupe keys and preserves provider event IDs", () => {
    const metadata = createSignalDedupeMetadata({
      strategy: "provider-native",
      category: "earthquake",
      provider: "USGS",
      providerEventId: "  USGS Event 123  ",
    });

    expect(metadata).toEqual({
      dedupeKey: "signal:earthquake:usgs:provider-native:usgs+event+123",
      providerEventId: "USGS Event 123",
    });
  });

  it("canonicalizes native IDs for matching while preserving trimmed provider metadata", () => {
    const first = createSignalDedupeMetadata({
      strategy: "provider-native",
      category: "earthquake",
      provider: "USGS",
      providerEventId: "  USGS   Event 123  ",
    });
    const second = createSignalDedupeMetadata({
      strategy: "provider-native",
      category: "earthquake",
      provider: "usgs",
      providerEventId: "usgs event 123",
    });

    expect(first.dedupeKey).toBe(second.dedupeKey);
    expect(first.providerEventId).toBe("USGS   Event 123");
    expect(second.providerEventId).toBe("usgs event 123");
  });

  it("builds provider-derived dedupe keys when a native ID is absent", () => {
    const metadata = createSignalDedupeMetadata({
      strategy: "provider-derived",
      category: "space-weather",
      provider: "NOAA SWPC",
      providerDerivedId: " K05 / 18 ",
    });

    expect(metadata).toEqual({
      dedupeKey: "signal:space-weather:noaa+swpc:provider-derived:k05+%2F+18",
    });
  });

  it("keeps conservative fingerprints stable regardless of input part ordering", () => {
    const first = createSignalDedupeMetadata({
      strategy: "conservative-fingerprint",
      category: "weather",
      provider: "tomorrow.io",
      fingerprintParts: [" Severe Wind ", " country:ke ", "2026-06-09T10:00:00Z"],
    });
    const second = createSignalDedupeMetadata({
      strategy: "conservative-fingerprint",
      category: "weather",
      provider: "tomorrow.io",
      fingerprintParts: ["2026-06-09T10:00:00Z", "country:ke", "severe   wind"],
    });

    expect(first.dedupeKey).toBe(second.dedupeKey);
  });

  it("keeps conservative fingerprints provider-scoped", () => {
    const tomorrow = createSignalDedupeMetadata({
      strategy: "conservative-fingerprint",
      category: "weather",
      provider: "tomorrow.io",
      fingerprintParts: ["country:ke", "severe wind"],
    });
    const openWeather = createSignalDedupeMetadata({
      strategy: "conservative-fingerprint",
      category: "weather",
      provider: "openweather",
      fingerprintParts: ["country:ke", "severe wind"],
    });

    expect(tomorrow.dedupeKey).not.toBe(openWeather.dedupeKey);
  });

  it("flags possible cross-provider duplicates without merging provider dedupe keys", () => {
    const tomorrow = createSignalDedupeMetadata({
      strategy: "conservative-fingerprint",
      category: "weather",
      provider: "tomorrow.io",
      fingerprintParts: ["tomorrow-provider-record", "country:ke"],
      possibleCrossProviderDuplicateParts: ["country:ke", "severe wind"],
    });
    const openWeather = createSignalDedupeMetadata({
      strategy: "provider-derived",
      category: "weather",
      provider: "openweather",
      providerDerivedId: "open-weather-record",
      possibleCrossProviderDuplicateParts: [" Severe   Wind ", " country:ke "],
    });

    expect(tomorrow.dedupeKey).not.toBe(openWeather.dedupeKey);
    expect(tomorrow.possibleCrossProviderDuplicateKey).toBe(
      openWeather.possibleCrossProviderDuplicateKey,
    );
  });

  it("does not flag possible cross-provider duplicates across different categories", () => {
    const weather = createSignalDedupeMetadata({
      strategy: "provider-derived",
      category: "weather",
      provider: "weather-provider",
      providerDerivedId: "record-1",
      possibleCrossProviderDuplicateParts: ["global", "issued-at:2026-06-09"],
    });
    const spaceWeather = createSignalDedupeMetadata({
      strategy: "provider-derived",
      category: "space-weather",
      provider: "space-provider",
      providerDerivedId: "record-2",
      possibleCrossProviderDuplicateParts: ["global", "issued-at:2026-06-09"],
    });

    expect(weather.possibleCrossProviderDuplicateKey).not.toBe(
      spaceWeather.possibleCrossProviderDuplicateKey,
    );
  });

  it("rejects empty IDs, empty providers, and insufficient fingerprint parts", () => {
    expect(() =>
      createSignalDedupeMetadata({
        strategy: "provider-native",
        category: "earthquake",
        provider: " ",
        providerEventId: "abc123",
      }),
    ).toThrow("provider must not be empty");
    expect(() =>
      createSignalDedupeMetadata({
        strategy: "provider-native",
        category: "earthquake",
        provider: "usgs",
        providerEventId: " ",
      }),
    ).toThrow("provider event ID must not be empty");
    expect(() =>
      createSignalDedupeMetadata({
        strategy: "conservative-fingerprint",
        category: "weather",
        provider: "tomorrow.io",
        fingerprintParts: ["country:ke"],
      }),
    ).toThrow("fingerprint parts must include at least two stable parts");
  });
});
