import { getRegionById, regions } from "./catalog";
import type { CountryId, Region, RegionId } from "./types";

export type RegionSearchResult =
  | {
      readonly id: CountryId;
      readonly kind: "country";
      readonly displayName: string;
      readonly alpha2: string;
    }
  | {
      readonly id: Exclude<RegionId, CountryId>;
      readonly kind: "country-group" | "continent";
      readonly displayName: string;
      readonly memberCountryIds: readonly CountryId[];
      readonly memberCount: number;
    };

const defaultRegionIds = [
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
] as const satisfies readonly RegionId[];

const normalizeSearchValue = (value: string): string =>
  value.trim().toLowerCase();

export const toRegionSearchResult = (region: Region): RegionSearchResult => {
  if (region.kind === "country") {
    return {
      id: region.id,
      kind: region.kind,
      displayName: region.displayName,
      alpha2: region.alpha2,
    };
  }

  return {
    id: region.id,
    kind: region.kind,
    displayName: region.displayName,
    memberCountryIds: region.memberCountryIds,
    memberCount: region.memberCountryIds.length,
  };
};

const matchRank = (region: Region, normalizedQuery: string): number => {
  const normalizedName = normalizeSearchValue(region.displayName);
  const normalizedId = normalizeSearchValue(region.id);

  if (normalizedName === normalizedQuery || normalizedId === normalizedQuery) {
    return 0;
  }

  if (
    normalizedName.startsWith(normalizedQuery) ||
    normalizedId.startsWith(normalizedQuery)
  ) {
    return 1;
  }

  if (
    normalizedName.includes(normalizedQuery) ||
    normalizedId.includes(normalizedQuery)
  ) {
    return 2;
  }

  return Number.POSITIVE_INFINITY;
};

export const searchRegions = (query?: string): RegionSearchResult[] => {
  const normalizedQuery = normalizeSearchValue(query ?? "");

  if (normalizedQuery.length === 0) {
    return defaultRegionIds.map((id) => {
      const region = getRegionById(id);

      if (!region) {
        throw new Error(`Default region ${id} is missing from the catalog`);
      }

      return toRegionSearchResult(region);
    });
  }

  return regions
    .map((region) => ({
      region,
      rank: matchRank(region, normalizedQuery),
    }))
    .filter(({ rank }) => Number.isFinite(rank))
    .sort((left, right) => {
      if (left.rank !== right.rank) {
        return left.rank - right.rank;
      }

      return left.region.displayName.localeCompare(right.region.displayName);
    })
    .map(({ region }) => toRegionSearchResult(region));
};
