import { describe, expect, it } from "vitest";
import {
  continents,
  countries,
  countryById,
  countryGroups,
  getCountryById,
  getRegionById,
  isRegionId,
  regionIdSchema,
  regionById,
  regions,
  type Continent,
  type CountryGroup,
  type CountryId,
  type Region,
} from "./index";

const requiredCountryIds = [
  "country:ke",
  "country:za",
  "country:br",
  "country:fr",
  "country:jp",
  "country:au",
  "country:aq",
] as const satisfies readonly CountryId[];

const memberNames = (region: CountryGroup | Continent): string[] =>
  region.memberCountryIds.map((id) => {
    const country = countryById.get(id);

    if (!country) {
      throw new Error(`Unknown country member ${id}`);
    }

    return country.displayName;
  });

const expectRegion = <T extends Region>(id: T["id"], kind: T["kind"]): T => {
  const region = getRegionById(id);

  expect(region).toBeDefined();
  expect(region?.kind).toBe(kind);

  return region as T;
};

describe("region catalog", () => {
  it("uses unique prefixed region IDs", () => {
    const ids = regions.map((region) => region.id);

    expect(new Set(ids).size).toBe(ids.length);

    for (const country of countries) {
      expect(country.id).toMatch(/^country:[a-z]{2}$/);
    }

    for (const group of countryGroups) {
      expect(group.id).toMatch(/^group:[a-z]+(?:-[a-z]+)*$/);
    }

    for (const continent of continents) {
      expect(continent.id).toMatch(/^continent:[a-z]+(?:-[a-z]+)*$/);
    }
  });

  it("keeps representative country IDs stable", () => {
    expect(countries).toHaveLength(249);

    for (const id of requiredCountryIds) {
      expect(getCountryById(id)?.id).toBe(id);
    }

    expect(getCountryById("country:ke")?.displayName).toBe("Kenya");
    expect(getCountryById("country:aq")?.displayName).toBe("Antarctica");
  });

  it("attaches latitude and longitude to countries that have fact records", () => {
    const kenya = getCountryById("country:ke");
    expect(kenya?.latitude).toBeCloseTo(-1.29);
    expect(kenya?.longitude).toBeCloseTo(36.82);

    const japan = getCountryById("country:jp");
    expect(japan?.latitude).toBeCloseTo(36.2);
    expect(japan?.longitude).toBeCloseTo(138.25);

    const totalsWithNullCentroid = countries.filter(
      (c) => c.latitude === null || c.longitude === null,
    );

    expect(totalsWithNullCentroid.length).toBeLessThan(countries.length);
  });

  it("keeps derived region indexes consistent", () => {
    expect(regions).toHaveLength(countries.length + countryGroups.length + continents.length);
    expect(regionById.size).toBe(regions.length);
    expect(countryById.size).toBe(countries.length);

    for (const region of regions) {
      expect(regionById.get(region.id)).toBe(region);
    }
  });

  it("validates only catalog-backed region IDs", () => {
    expect(regionIdSchema.parse("country:ke")).toBe("country:ke");
    expect(regionIdSchema.parse("group:eastern-africa")).toBe("group:eastern-africa");
    expect(regionIdSchema.parse("continent:africa")).toBe("continent:africa");

    expect(regionIdSchema.safeParse("banana").success).toBe(false);
    expect(regionIdSchema.safeParse("country:xx").success).toBe(false);
    expect(regionIdSchema.safeParse("group:not-real").success).toBe(false);

    const maybeRegionId = "country:ke";

    if (!isRegionId(maybeRegionId)) {
      throw new Error("Expected Kenya to be a known region ID");
    }

    expect(getRegionById(maybeRegionId)?.displayName).toBe("Kenya");
    expect(isRegionId("banana")).toBe(false);
  });

  it("only references known country members", () => {
    for (const region of [...countryGroups, ...continents]) {
      expect(region.memberCountryIds.length).toBeGreaterThan(0);

      for (const countryId of region.memberCountryIds) {
        expect(countryById.has(countryId)).toBe(true);
      }
    }
  });

  it("defines representative Africa regional group membership", () => {
    const northernAfrica = expectRegion<CountryGroup>("group:northern-africa", "country-group");
    const easternAfrica = expectRegion<CountryGroup>("group:eastern-africa", "country-group");
    const middleAfrica = expectRegion<CountryGroup>("group:middle-africa", "country-group");
    const southernAfrica = expectRegion<CountryGroup>("group:southern-africa", "country-group");
    const westernAfrica = expectRegion<CountryGroup>("group:western-africa", "country-group");

    expect(memberNames(northernAfrica)).toContain("Egypt");
    expect(memberNames(easternAfrica)).toContain("Kenya");
    expect(memberNames(middleAfrica)).toContain("Democratic Republic of the Congo");
    expect(memberNames(southernAfrica)).toContain("South Africa");
    expect(memberNames(westernAfrica)).toContain("Nigeria");
  });

  it("defines representative UN M49 macro-region continent membership", () => {
    const africa = expectRegion<Continent>("continent:africa", "continent");
    const americas = expectRegion<Continent>("continent:americas", "continent");
    const asia = expectRegion<Continent>("continent:asia", "continent");
    const europe = expectRegion<Continent>("continent:europe", "continent");
    const oceania = expectRegion<Continent>("continent:oceania", "continent");
    const antarctica = expectRegion<Continent>("continent:antarctica", "continent");

    expect(memberNames(africa)).toContain("Kenya");
    expect(memberNames(americas)).toContain("Brazil");
    expect(memberNames(asia)).toContain("Japan");
    expect(memberNames(europe)).toContain("France");
    expect(memberNames(oceania)).toContain("Australia");
    expect(memberNames(antarctica)).toEqual(["Antarctica"]);
  });
});
