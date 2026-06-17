import { describe, expect, it } from "vitest";
import { usgsMagnitudeToSeverity, normalizeUsgsResponse } from "./normalizer";
import fixture from "./__fixtures__/significant-day.json";

describe("usgsMagnitudeToSeverity", () => {
  it("maps >= 7 to extreme", () => {
    expect(usgsMagnitudeToSeverity(7.0)).toBe("extreme");
    expect(usgsMagnitudeToSeverity(8.5)).toBe("extreme");
    expect(usgsMagnitudeToSeverity(9.1)).toBe("extreme");
  });

  it("maps >= 6 to severe", () => {
    expect(usgsMagnitudeToSeverity(6.0)).toBe("severe");
    expect(usgsMagnitudeToSeverity(6.5)).toBe("severe");
    expect(usgsMagnitudeToSeverity(6.9)).toBe("severe");
  });

  it("maps >= 5 to significant", () => {
    expect(usgsMagnitudeToSeverity(5.0)).toBe("significant");
    expect(usgsMagnitudeToSeverity(5.3)).toBe("significant");
    expect(usgsMagnitudeToSeverity(5.9)).toBe("significant");
  });

  it("maps >= 4 to moderate", () => {
    expect(usgsMagnitudeToSeverity(4.0)).toBe("moderate");
    expect(usgsMagnitudeToSeverity(4.5)).toBe("moderate");
    expect(usgsMagnitudeToSeverity(4.9)).toBe("moderate");
  });

  it("maps < 4 to minor", () => {
    expect(usgsMagnitudeToSeverity(0.0)).toBe("minor");
    expect(usgsMagnitudeToSeverity(2.5)).toBe("minor");
    expect(usgsMagnitudeToSeverity(3.9)).toBe("minor");
  });

  it("maps null and undefined to minor", () => {
    expect(usgsMagnitudeToSeverity(null)).toBe("minor");
    expect(usgsMagnitudeToSeverity(undefined)).toBe("minor");
  });
});

describe("normalizeUsgsResponse", () => {
  it("returns normalized signals for valid features", () => {
    const { signals, skipped } = normalizeUsgsResponse(fixture);

    expect(signals).toHaveLength(5);
    expect(skipped).toHaveLength(0);

    const first = signals[0]!;
    expect(first.provider).toBe("usgs");
    expect(first.dedupeKey).toBe("usgs:earthquake:us7000srb1");
    expect(first.providerEventId).toBe("us7000srb1");
    expect(first.category).toBe("earthquake");
    expect(first.severity).toBe("extreme");
    expect(first.confidence).toBe("high");
    expect(first.scope).toEqual({ kind: "point", coordinates: [125.0469, 5.5918] });
    expect(first.sourceLink).toEqual({
      url: "https://earthquake.usgs.gov/earthquakes/eventpage/us7000srb1",
      label: "USGS Earthquake Page",
    });
  });

  it("maps severity from magnitude", () => {
    const { signals } = normalizeUsgsResponse(fixture);
    expect(signals.map((s) => ({ id: s.providerEventId, severity: s.severity }))).toEqual([
      { id: "us7000srb1", severity: "extreme" },
      { id: "us6000t04s", severity: "severe" },
      { id: "us7000st95", severity: "severe" },
      { id: "us6000sz1d", severity: "severe" },
      { id: "us7000srcg", severity: "severe" },
    ]);
  });

  it("includes timestamps as round-trippable ISO strings", () => {
    const { signals } = normalizeUsgsResponse(fixture);
    for (const signal of signals) {
      expect(new Date(signal.effectiveAt).toISOString()).toBe(signal.effectiveAt);
      expect(new Date(signal.occurredAt!).toISOString()).toBe(signal.occurredAt);
      expect(new Date(signal.issuedAt!).toISOString()).toBe(signal.issuedAt);
    }
  });

  it("sets scope to global when geometry is null", () => {
    const { signals } = normalizeUsgsResponse({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          id: "test-no-geom",
          geometry: null,
          properties: {
            mag: 5.0,
            place: "Somewhere",
            time: 1780875461803,
            updated: 1781665603616,
            url: "https://example.com",
          },
        },
      ],
    });

    expect(signals).toHaveLength(1);
    expect(signals[0]!.scope).toEqual({ kind: "global" });
  });

  it("skips malformed features and reports them in skipped", () => {
    const { signals, skipped } = normalizeUsgsResponse({
      type: "FeatureCollection",
      features: [
        { type: "Feature", id: "good", geometry: { type: "Point", coordinates: [0, 0] }, properties: { mag: 4.0, place: "A", time: 1000, updated: 1000, url: "https://a.com" } },
        { type: "NotAFeature", id: "bad" },
        { type: "Feature", id: "good2", geometry: { type: "Point", coordinates: [1, 1] }, properties: { mag: 3.0, place: "B", time: 2000, updated: 2000, url: "https://b.com" } },
      ],
    });

    expect(signals).toHaveLength(2);
    expect(signals[0]!.providerEventId).toBe("good");
    expect(signals[1]!.providerEventId).toBe("good2");
    expect(skipped).toEqual([{ id: "bad" }]);
  });

  it("throws on non-FeatureCollection input", () => {
    expect(() => normalizeUsgsResponse({ type: "NotACollection" })).toThrow();
  });

  it("returns empty signals and skipped for empty features list", () => {
    const { signals, skipped } = normalizeUsgsResponse({ type: "FeatureCollection", features: [] });
    expect(signals).toEqual([]);
    expect(skipped).toEqual([]);
  });

  it("handles null magnitude", () => {
    const { signals } = normalizeUsgsResponse({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          id: "null-mag",
          geometry: { type: "Point", coordinates: [0, 0] },
          properties: { mag: null, place: "Somewhere", time: 1000, updated: 1000, url: "https://a.com" },
        },
      ],
    });

    expect(signals[0]!.severity).toBe("minor");
  });

  it("handles missing magnitude", () => {
    const { signals } = normalizeUsgsResponse({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          id: "no-mag",
          geometry: { type: "Point", coordinates: [0, 0] },
          properties: { place: "Somewhere", time: 1000, updated: 1000, url: "https://a.com" },
        },
      ],
    });

    expect(signals[0]!.severity).toBe("minor");
  });
});
