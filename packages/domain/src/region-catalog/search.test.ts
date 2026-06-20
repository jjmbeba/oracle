import { describe, expect, it } from "vitest";
import { searchRegions } from "./search";

describe("region search", () => {
  it("returns curated defaults for blank queries", () => {
    expect(searchRegions().map((region) => region.id)).toEqual([
      "country:ke",
      "country:za",
      "country:br",
      "country:fr",
      "country:jp",
      "country:au",
      "continent:africa",
      "group:eastern-africa",
      "continent:europe",
      "continent:asia",
    ]);

    expect(searchRegions("   ").map((region) => region.id)).toEqual([
      "country:ke",
      "country:za",
      "country:br",
      "country:fr",
      "country:jp",
      "country:au",
      "continent:africa",
      "group:eastern-africa",
      "continent:europe",
      "continent:asia",
    ]);
  });

  it("finds countries case-insensitively by display name", () => {
    expect(searchRegions("KeNyA")[0]).toEqual({
      id: "country:ke",
      kind: "country",
      displayName: "Kenya",
      alpha2: "KE",
    });
  });

  it("finds country groups and continents", () => {
    const resultIds = searchRegions("africa").map((region) => region.id);

    expect(resultIds).toContain("continent:africa");
    expect(resultIds).toContain("group:eastern-africa");
    expect(resultIds).toContain("country:za");
  });

  it("matches by region ID", () => {
    expect(searchRegions("group:eastern-africa")[0]?.id).toBe("group:eastern-africa");
  });

  it("orders exact matches before prefix and contains matches", () => {
    const resultIds = searchRegions("africa").map((region) => region.id);

    expect(resultIds[0]).toBe("continent:africa");
    expect(resultIds.indexOf("continent:africa")).toBeLessThan(resultIds.indexOf("country:za"));
  });
});
