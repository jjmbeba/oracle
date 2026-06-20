import { describe, expect, it } from "vitest";
import type { CountryId, NormalizedSignal } from "./types";
import { matchSignalsToRegion } from "./signal-matching";

const makeSignal = (overrides: Partial<NormalizedSignal> = {}): NormalizedSignal => ({
  provider: "test",
  dedupeKey: `signal:test:${Math.random()}`,
  category: "earthquake",
  title: "Test",
  severity: "moderate",
  confidence: "medium",
  effectiveAt: new Date().toISOString(),
  scope: { kind: "global" },
  ...overrides,
});

const KENYA = "country:ke" as CountryId;
const JAPAN = "country:jp" as CountryId;
const UGANDA = "country:ug" as CountryId;

describe("matchSignalsToRegion", () => {
  it("includes region-scoped signals whose regionId matches a member", () => {
    const regionSignal = makeSignal({
      scope: { kind: "region", regionId: "country:ke" },
    });
    const otherRegionSignal = makeSignal({
      scope: { kind: "region", regionId: "country:za" },
    });
    const matched = matchSignalsToRegion([regionSignal, otherRegionSignal], [KENYA]);
    expect(matched).toEqual([regionSignal]);
  });

  it("includes global signals for any region", () => {
    const global = makeSignal({ scope: { kind: "global" } });
    const matched = matchSignalsToRegion([global], [KENYA]);
    expect(matched).toEqual([global]);
  });

  it("includes point signals inside a member country's bounding box", () => {
    // Tokyo is in Japan (bounds: 129.41, 31.03, 145.54, 45.55)
    const tokyoSignal = makeSignal({ scope: { kind: "point", coordinates: [139.65, 35.68] } });
    const matched = matchSignalsToRegion([tokyoSignal], [JAPAN]);
    expect(matched).toEqual([tokyoSignal]);
  });

  it("excludes point signals outside all member country bounding boxes", () => {
    // Nairobi is in Kenya, not Japan
    const nairobiSignal = makeSignal({ scope: { kind: "point", coordinates: [36.82, -1.29] } });
    const matched = matchSignalsToRegion([nairobiSignal], [JAPAN]);
    expect(matched).toEqual([]);
  });

  it("includes point signals when at least one member contains the point", () => {
    // Nairobi for Eastern Africa (Kenya + Uganda + ...)
    const nairobiSignal = makeSignal({ scope: { kind: "point", coordinates: [36.82, -1.29] } });
    const matched = matchSignalsToRegion([nairobiSignal], [KENYA, UGANDA, JAPAN]);
    expect(matched).toEqual([nairobiSignal]);
  });

  it("includes geometry signals conservatively (deferred polygon matching)", () => {
    const geomSignal = makeSignal({
      scope: {
        kind: "geometry",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
        },
      },
    });
    const matched = matchSignalsToRegion([geomSignal], [JAPAN]);
    expect(matched).toEqual([geomSignal]);
  });

  it("treats point signals as unmatched when every member country has no bounds", () => {
    // AX (Aland Islands) has no bounds in the catalog
    const tokyoSignal = makeSignal({ scope: { kind: "point", coordinates: [139.65, 35.68] } });
    const matched = matchSignalsToRegion([tokyoSignal], ["country:ax" as CountryId]);
    expect(matched).toEqual([]);
  });

  it("returns an empty array when given no signals", () => {
    expect(matchSignalsToRegion([], [KENYA])).toEqual([]);
  });
});
