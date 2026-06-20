import { countryFactRecords } from "./source-country-facts";
import { countrySourceRecords } from "./source-countries";
import { countryBoundsRecords } from "./source-country-bounds";
import { continentSourceRecords, countryGroupSourceRecords } from "./source-regions";
import type {
  Continent,
  ContinentId,
  Country,
  CountryBounds,
  CountryGroup,
  CountryGroupId,
  CountryId,
  Region,
  RegionId,
} from "./types";

const toCountryId = (alpha2: string): CountryId => `country:${alpha2.toLowerCase()}` as CountryId;

const centroidByAlpha2 = new Map<string, { latitude: number; longitude: number }>();

for (const [
  alpha2,
  _capital,
  _population,
  _languages,
  _currencies,
  latitude,
  longitude,
] of countryFactRecords) {
  if (latitude !== null && longitude !== null) {
    centroidByAlpha2.set(alpha2, { latitude, longitude });
  }
}

const boundsByAlpha2 = new Map<string, CountryBounds>();

for (const [alpha2, west, south, east, north] of countryBoundsRecords) {
  boundsByAlpha2.set(alpha2, { west, south, east, north });
}

const memberCountryIdsFor = (
  sourceIndex: 2 | 3,
  regionId: ContinentId | CountryGroupId,
): CountryId[] =>
  countrySourceRecords
    .filter((record) => record[sourceIndex] === regionId)
    .map(([alpha2]) => toCountryId(alpha2));

export const countries: readonly Country[] = countrySourceRecords.map(([alpha2, displayName]) => {
  const centroid = centroidByAlpha2.get(alpha2);

  return {
    id: toCountryId(alpha2),
    kind: "country",
    alpha2,
    displayName,
    latitude: centroid?.latitude ?? null,
    longitude: centroid?.longitude ?? null,
    bounds: boundsByAlpha2.get(alpha2) ?? null,
  };
});

export const countryGroups: readonly CountryGroup[] = countryGroupSourceRecords.map(
  ({ id, displayName }) => ({
    id,
    kind: "country-group",
    displayName,
    memberCountryIds: memberCountryIdsFor(3, id),
  }),
);

export const continents: readonly Continent[] = continentSourceRecords.map(
  ({ id, displayName }) => ({
    id,
    kind: "continent",
    displayName,
    memberCountryIds: memberCountryIdsFor(2, id),
  }),
);

export const regions: readonly Region[] = [...countries, ...countryGroups, ...continents];

export const regionById: ReadonlyMap<RegionId, Region> = new Map(
  regions.map((region) => [region.id, region]),
);

export const countryById: ReadonlyMap<CountryId, Country> = new Map(
  countries.map((country) => [country.id, country]),
);

export const getRegionById = (id: RegionId): Region | undefined => regionById.get(id);

export const getCountryById = (id: CountryId): Country | undefined => countryById.get(id);

export const isRegionId = (value: string): value is RegionId => regionById.has(value as RegionId);

export const getRegionMemberCountryIds = (id: RegionId): readonly CountryId[] => {
  const region = regionById.get(id);

  if (!region) return [];

  if (region.kind === "country") {
    return [region.id];
  }

  return region.memberCountryIds;
};
