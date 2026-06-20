import { describe, expect, it } from "vitest";
import {
  normalizedSignalSchema,
  signalCategories,
  signalConfidenceLabels,
  signalConfidences,
  signalScopeSchema,
  signalScopes,
  signalSeverities,
  signalSeverityLabels,
} from "./index";

const baseSignal = {
  provider: "usgs",
  dedupeKey: "usgs:earthquake:abc123",
  category: "earthquake",
  title: "M 5.1 - 10 km W of Example",
  severity: "significant",
  confidence: "high",
  effectiveAt: "2026-06-09T10:15:00.000Z",
} as const;

describe("signal domain values", () => {
  it("defines the MVP signal categories, scopes, severity, and confidence", () => {
    expect(signalCategories).toEqual(["earthquake", "weather", "space-weather"]);
    expect(signalScopes).toEqual(["global", "region", "point", "geometry"]);
    expect(signalSeverities).toEqual(["minor", "moderate", "significant", "severe", "extreme"]);
    expect(signalConfidences).toEqual(["high", "medium", "low"]);
  });

  it("keeps public labels stable", () => {
    expect(signalSeverityLabels).toEqual({
      minor: "Minor",
      moderate: "Moderate",
      significant: "Significant",
      severe: "Severe",
      extreme: "Extreme",
    });
    expect(signalConfidenceLabels).toEqual({
      high: "High",
      medium: "Medium",
      low: "Low",
    });
  });
});

describe("signal scope schema", () => {
  it("accepts all supported scope shapes", () => {
    expect(signalScopeSchema.safeParse({ kind: "global" }).success).toBe(true);
    expect(
      signalScopeSchema.safeParse({
        kind: "region",
        regionId: "country:ke",
      }).success,
    ).toBe(true);
    expect(
      signalScopeSchema.safeParse({
        kind: "point",
        coordinates: [36.8219, -1.2921],
      }).success,
    ).toBe(true);
    expect(
      signalScopeSchema.safeParse({
        kind: "geometry",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [36, -2],
              [37, -2],
              [37, -1],
              [36, -2],
            ],
          ],
        },
      }).success,
    ).toBe(true);
  });

  it("rejects mismatched or imprecise scope payloads", () => {
    expect(
      signalScopeSchema.safeParse({
        kind: "global",
        coordinates: [36.8219, -1.2921],
      }).success,
    ).toBe(false);
    expect(
      signalScopeSchema.safeParse({
        kind: "point",
        coordinates: [181, -1.2921],
      }).success,
    ).toBe(false);
    expect(
      signalScopeSchema.safeParse({
        kind: "geometry",
        geometry: {
          type: "Point",
          coordinates: [36.8219, -1.2921],
        },
      }).success,
    ).toBe(false);
    expect(
      signalScopeSchema.safeParse({
        kind: "region",
        regionId: "country:xx",
      }).success,
    ).toBe(false);
    expect(
      signalScopeSchema.safeParse({
        kind: "geometry",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [36, -2],
              [37, -2],
              [37, -1],
              [36, -1],
            ],
          ],
        },
      }).success,
    ).toBe(false);
  });

  it("validates closed rings for polygon and multipolygon signal geometry", () => {
    expect(
      signalScopeSchema.safeParse({
        kind: "geometry",
        geometry: {
          type: "MultiPolygon",
          coordinates: [
            [
              [
                [36, -2],
                [37, -2],
                [37, -1],
                [36, -2],
              ],
            ],
          ],
        },
      }).success,
    ).toBe(true);
    expect(
      signalScopeSchema.safeParse({
        kind: "geometry",
        geometry: {
          type: "MultiPolygon",
          coordinates: [
            [
              [
                [36, -2],
                [37, -2],
                [37, -1],
                [36, -1],
              ],
            ],
          ],
        },
      }).success,
    ).toBe(false);
  });
});

describe("normalized signal schema", () => {
  it("parses normalized signal examples for every scope", () => {
    const scopes = [
      { kind: "global" },
      { kind: "region", regionId: "continent:africa" },
      { kind: "point", coordinates: [36.8219, -1.2921] },
      {
        kind: "geometry",
        geometry: {
          type: "LineString",
          coordinates: [
            [36, -2],
            [37, -1],
          ],
        },
      },
    ] as const;

    for (const scope of scopes) {
      expect(
        normalizedSignalSchema.safeParse({
          ...baseSignal,
          scope,
        }).success,
      ).toBe(true);
    }
  });

  it("preserves optional provider event IDs, source links, and source times", () => {
    const parsed = normalizedSignalSchema.parse({
      ...baseSignal,
      providerEventId: "abc123",
      possibleCrossProviderDuplicateKey: "opaque-cross-provider-key",
      issuedAt: "2026-06-09T10:00:00.000Z",
      occurredAt: "2026-06-09T09:58:00.000Z",
      scope: { kind: "global" },
      sourceLink: {
        url: "https://example.com/source/abc123",
        label: "Example Source",
      },
    });

    expect(parsed.providerEventId).toBe("abc123");
    expect(parsed.possibleCrossProviderDuplicateKey).toBe("opaque-cross-provider-key");
    expect(parsed.sourceLink?.label).toBe("Example Source");
  });

  it("rejects records missing required contract fields", () => {
    expect(
      normalizedSignalSchema.safeParse({
        ...baseSignal,
        dedupeKey: undefined,
        scope: { kind: "global" },
      }).success,
    ).toBe(false);
    expect(
      normalizedSignalSchema.safeParse({
        ...baseSignal,
        effectiveAt: undefined,
        scope: { kind: "global" },
      }).success,
    ).toBe(false);
  });

  it("rejects unsupported values and invalid source URLs", () => {
    expect(
      normalizedSignalSchema.safeParse({
        ...baseSignal,
        category: "health",
        scope: { kind: "global" },
      }).success,
    ).toBe(false);
    expect(
      normalizedSignalSchema.safeParse({
        ...baseSignal,
        severity: "critical",
        scope: { kind: "global" },
      }).success,
    ).toBe(false);
    expect(
      normalizedSignalSchema.safeParse({
        ...baseSignal,
        scope: { kind: "global" },
        sourceLink: { url: "not a url" },
      }).success,
    ).toBe(false);
  });
});
