import { describe, expect, it } from "vitest";
import type { RegionSearchResult } from "./api";
import {
  getRegionKindLabel,
  getRegionMetaLabel,
  isRegionSelected,
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
});
