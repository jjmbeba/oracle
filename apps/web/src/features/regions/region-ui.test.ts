import { describe, expect, it } from "vitest";
import type { RegionSearchResult } from "./api";
import {
  getRegionKindLabel,
  getRegionMetaLabel,
  isRegionSelected,
  riskLevelLabel,
  riskLevelColor,
  buildDossierStatusStrip,
} from "./region-ui";

const kenya: RegionSearchResult = {
  id: "country:ke",
  kind: "country",
  displayName: "Kenya",
  alpha2: "KE",
};

const easternAfrica: RegionSearchResult = {
  id: "group:eastern-africa",
  kind: "country-group",
  displayName: "Eastern Africa",
  memberCountryIds: ["country:ke", "country:tz"],
  memberCount: 2,
};

const africa: RegionSearchResult = {
  id: "continent:africa",
  kind: "continent",
  displayName: "Africa",
  memberCountryIds: ["country:ke", "country:tz", "country:za"],
  memberCount: 3,
};

describe("region UI helpers", () => {
  it("formats human-readable region kind labels", () => {
    expect(getRegionKindLabel(kenya)).toBe("Country");
    expect(getRegionKindLabel(easternAfrica)).toBe("Country group");
    expect(getRegionKindLabel(africa)).toBe("Continent");
  });

  it("formats country metadata with the alpha-2 code", () => {
    expect(getRegionMetaLabel(kenya)).toBe("KE");
  });

  it("formats grouped region metadata with member counts", () => {
    expect(getRegionMetaLabel(easternAfrica)).toBe("2 countries");
    expect(getRegionMetaLabel({ ...easternAfrica, memberCount: 1 })).toBe("1 country");
  });

  it("compares selected regions by id", () => {
    expect(isRegionSelected(kenya, kenya)).toBe(true);
    expect(isRegionSelected(kenya, africa)).toBe(false);
    expect(isRegionSelected(kenya, null)).toBe(false);
  });

  it("maps risk level values to display labels", () => {
    expect(riskLevelLabel("quiet")).toBe("Quiet");
    expect(riskLevelLabel("watch")).toBe("Watch");
    expect(riskLevelLabel("elevated")).toBe("Elevated");
    expect(riskLevelLabel("high")).toBe("High");
    expect(riskLevelLabel("critical")).toBe("Critical");
  });

  it("maps risk level values to distinct display colors", () => {
    const colors = [
      riskLevelColor("quiet"),
      riskLevelColor("watch"),
      riskLevelColor("elevated"),
      riskLevelColor("high"),
      riskLevelColor("critical"),
    ];
    expect(new Set(colors).size).toBe(5);
  });
});

describe("buildDossierStatusStrip", () => {
  it("always leads with the region label and ends with the risk line", () => {
    const strip = buildDossierStatusStrip({
      regionLabel: "Kenya",
      isWatched: false,
      activeCount: 0,
      lastUpdatedAt: null,
      riskScore: 12,
      riskLevel: "quiet",
    });
    expect(strip[0]).toBe("Kenya");
    expect(strip[strip.length - 1]).toBe("Risk 12/100 Quiet");
  });

  it("omits the active count when no signals are present", () => {
    const strip = buildDossierStatusStrip({
      regionLabel: "Kenya",
      isWatched: false,
      activeCount: 0,
      lastUpdatedAt: null,
      riskScore: 0,
      riskLevel: "quiet",
    });
    expect(strip.some((s) => s.includes("active"))).toBe(false);
  });

  it("includes the active count when signals are present", () => {
    const strip = buildDossierStatusStrip({
      regionLabel: "Kenya",
      isWatched: false,
      activeCount: 7,
      lastUpdatedAt: null,
      riskScore: 42,
      riskLevel: "watch",
    });
    expect(strip).toContain("7 active");
  });

  it("includes the watched marker only when watched", () => {
    const unwatched = buildDossierStatusStrip({
      regionLabel: "Kenya",
      isWatched: false,
      activeCount: 0,
      lastUpdatedAt: null,
      riskScore: 0,
      riskLevel: "quiet",
    });
    expect(unwatched).not.toContain("Watched");

    const watched = buildDossierStatusStrip({
      regionLabel: "Kenya",
      isWatched: true,
      activeCount: 0,
      lastUpdatedAt: null,
      riskScore: 0,
      riskLevel: "quiet",
    });
    expect(watched).toContain("Watched");
  });

  it("includes the freshness line only when a timestamp is given", () => {
    const without = buildDossierStatusStrip({
      regionLabel: "Kenya",
      isWatched: false,
      activeCount: 0,
      lastUpdatedAt: null,
      riskScore: 0,
      riskLevel: "quiet",
    });
    expect(without.some((s) => s.startsWith("Updated"))).toBe(false);

    const withTs = buildDossierStatusStrip({
      regionLabel: "Kenya",
      isWatched: false,
      activeCount: 0,
      lastUpdatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      riskScore: 0,
      riskLevel: "quiet",
    });
    expect(withTs.some((s) => s.startsWith("Updated"))).toBe(true);
  });
});
