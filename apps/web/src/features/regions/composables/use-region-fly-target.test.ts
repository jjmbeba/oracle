import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { useRegionFlyTarget } from "./use-region-fly-target";
import type { RegionSearchResult } from "../api";

const kenya: RegionSearchResult = {
  id: "country:ke",
  kind: "country",
  displayName: "Kenya",
  alpha2: "KE",
};

const asiaGroup: RegionSearchResult = {
  id: "continent:asia",
  kind: "continent",
  displayName: "Asia",
  memberCountryIds: ["country:jp"],
  memberCount: 1,
};

describe("useRegionFlyTarget", () => {
  it("returns null when no region is selected and no override is set", () => {
    const selectedRegion = ref<RegionSearchResult | null>(null);
    const { flyTarget } = useRegionFlyTarget(selectedRegion);

    expect(flyTarget.value).toBeNull();
  });

  it("resolves the fly target synchronously from the country catalog", () => {
    const selectedRegion = ref<RegionSearchResult | null>(kenya);
    const { flyTarget } = useRegionFlyTarget(selectedRegion);

    expect(flyTarget.value).not.toBeNull();
    const [[west, south], [east, north]] = flyTarget.value!.bounds;
    expect(east - west).toBeGreaterThan(0);
    expect(north - south).toBeGreaterThan(0);
  });

  it("prefers the override over the region-derived target", () => {
    const selectedRegion = ref<RegionSearchResult | null>(kenya);
    const { flyTarget, flyToPoint, clearOverride } = useRegionFlyTarget(selectedRegion);

    flyToPoint(10, 20);
    expect(flyTarget.value?.bounds).toEqual([
      [9.5, 19.5],
      [10.5, 20.5],
    ]);

    clearOverride();
    expect(flyTarget.value).not.toBeNull();
    expect(flyTarget.value!.bounds).not.toEqual([
      [9.5, 19.5],
      [10.5, 20.5],
    ]);
  });

  it("returns null for groups and continents", () => {
    const selectedRegion = ref<RegionSearchResult | null>(asiaGroup);
    const { flyTarget } = useRegionFlyTarget(selectedRegion);

    expect(flyTarget.value).toBeNull();
  });
});
