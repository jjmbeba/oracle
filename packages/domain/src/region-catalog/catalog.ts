import { countrySourceRecords } from "./source-countries";
import {
  continentSourceRecords,
  countryGroupSourceRecords,
} from "./source-regions";
import type {
  Continent,
  ContinentId,
  Country,
  CountryGroup,
  CountryGroupId,
  CountryId,
  Region,
  RegionId,
} from "./types";

const toCountryId = (alpha2: string): CountryId =>
  `country:${alpha2.toLowerCase()}` as CountryId;

const memberCountryIdsFor = (
  sourceIndex: 2 | 3,
  regionId: ContinentId | CountryGroupId,
): CountryId[] =>
  countrySourceRecords
    .filter((record) => record[sourceIndex] === regionId)
    .map(([alpha2]) => toCountryId(alpha2));

export const countries: readonly Country[] = countrySourceRecords.map(
  ([alpha2, displayName]) => ({
    id: toCountryId(alpha2),
    kind: "country",
    alpha2,
    displayName,
  }),
);

export const countryGroups: readonly CountryGroup[] =
  countryGroupSourceRecords.map(({ id, displayName }) => ({
    id,
    kind: "country-group",
    displayName,
    memberCountryIds: memberCountryIdsFor(3, id),
  }));

export const continents: readonly Continent[] = continentSourceRecords.map(
  ({ id, displayName }) => ({
    id,
    kind: "continent",
    displayName,
    memberCountryIds: memberCountryIdsFor(2, id),
  }),
);

export const regions: readonly Region[] = [
  ...countries,
  ...countryGroups,
  ...continents,
];

export const regionById: ReadonlyMap<RegionId, Region> = new Map(
  regions.map((region) => [region.id, region]),
);

export const countryById: ReadonlyMap<CountryId, Country> = new Map(
  countries.map((country) => [country.id, country]),
);

export const getRegionById = (id: RegionId): Region | undefined =>
  regionById.get(id);

export const getCountryById = (id: CountryId): Country | undefined =>
  countryById.get(id);

export const isRegionId = (value: string): value is RegionId =>
  regionById.has(value as RegionId);
