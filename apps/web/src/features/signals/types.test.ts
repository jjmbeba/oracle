import { describe, expect, it } from "vitest";
import {
  CATEGORY_LABELS,
  SEVERITY_ORDER,
  SEVERITY_STYLES,
  SIGNAL_CATEGORIES,
  isSignalCategory,
  isSignalSeverity,
  signalFeedToGeoJson,
} from "./types";
import type { SignalFeedItem } from "./api";

const pointSignal: SignalFeedItem = {
  provider: "usgs",
  category: "earthquake",
  title: "M 5.2 - 12 km SW of Hilo, Hawaii",
  severity: "moderate",
  confidence: "high",
  effectiveAt: "2026-06-18T12:00:00.000Z",
  scope: { kind: "point", coordinates: [-155.1, 19.6] },
  sourceLink: { url: "https://example.com", label: "USGS" },
};

const globalSignal: SignalFeedItem = {
  provider: "swpc",
  category: "space-weather",
  title: "G2 geomagnetic storm",
  severity: "significant",
  confidence: "medium",
  effectiveAt: "2026-06-18T12:00:00.000Z",
  scope: { kind: "global" },
};

describe("SEVERITY_ORDER", () => {
  it("orders extreme before severe", () => {
    expect(SEVERITY_ORDER.extreme).toBeLessThan(SEVERITY_ORDER.severe);
  });

  it("orders severe before significant", () => {
    expect(SEVERITY_ORDER.severe).toBeLessThan(SEVERITY_ORDER.significant);
  });

  it("orders significant before moderate", () => {
    expect(SEVERITY_ORDER.significant).toBeLessThan(SEVERITY_ORDER.moderate);
  });

  it("orders moderate before minor", () => {
    expect(SEVERITY_ORDER.moderate).toBeLessThan(SEVERITY_ORDER.minor);
  });
});

describe("SIGNAL_CATEGORIES and CATEGORY_LABELS", () => {
  it("covers every category in the labels", () => {
    for (const category of SIGNAL_CATEGORIES) {
      expect(CATEGORY_LABELS[category]).toBeTruthy();
    }
  });
});

describe("isSignalSeverity", () => {
  it("accepts known severities", () => {
    expect(isSignalSeverity("minor")).toBe(true);
    expect(isSignalSeverity("extreme")).toBe(true);
  });

  it("rejects unknown severities", () => {
    expect(isSignalSeverity("catastrophic")).toBe(false);
    expect(isSignalSeverity("")).toBe(false);
  });
});

describe("isSignalCategory", () => {
  it("accepts known categories", () => {
    expect(isSignalCategory("earthquake")).toBe(true);
    expect(isSignalCategory("space-weather")).toBe(true);
  });

  it("rejects unknown categories", () => {
    expect(isSignalCategory("volcano")).toBe(false);
  });
});

describe("signalFeedToGeoJson", () => {
  it("converts a point-scoped signal to a GeoJSON feature", () => {
    const result = signalFeedToGeoJson([pointSignal]);
    expect(result.type).toBe("FeatureCollection");
    expect(result.features).toHaveLength(1);
    expect(result.features[0].type).toBe("Feature");
    expect(result.features[0].geometry).toEqual({
      type: "Point",
      coordinates: [-155.1, 19.6],
    });
  });

  it("preserves signal properties in the GeoJSON feature", () => {
    const result = signalFeedToGeoJson([pointSignal]);
    const props = result.features[0].properties;
    expect(props.provider).toBe("usgs");
    expect(props.title).toBe(pointSignal.title);
    expect(props.severity).toBe("moderate");
    expect(props.confidence).toBe("high");
    expect(props.effectiveAt).toBe(pointSignal.effectiveAt);
    expect(props.sourceLinkUrl).toBe("https://example.com");
    expect(props.sourceLinkLabel).toBe("USGS");
  });

  it("filters out non-point-scoped signals", () => {
    const result = signalFeedToGeoJson([pointSignal, globalSignal]);
    expect(result.features).toHaveLength(1);
  });

  it("returns empty features for no point signals", () => {
    const result = signalFeedToGeoJson([globalSignal]);
    expect(result.features).toHaveLength(0);
  });

  it("returns empty features for empty input", () => {
    const result = signalFeedToGeoJson([]);
    expect(result.features).toHaveLength(0);
  });

  it("generates a stable feature id", () => {
    const result = signalFeedToGeoJson([pointSignal]);
    expect(result.features[0].id).toBe("usgs-2026-06-18T12:00:00.000Z--155.1-19.6");
  });

  it("uses the canonical severity style as the source of truth", () => {
    expect(SEVERITY_STYLES.moderate.color).toBe("#7aaa6b");
  });
});
