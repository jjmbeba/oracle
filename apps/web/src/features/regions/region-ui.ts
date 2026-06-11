import type { RegionSearchResult } from "./api";

export function getRegionKindLabel(region: RegionSearchResult): string {
  if (region.kind === "country") {
    return "Country";
  }

  if (region.kind === "country-group") {
    return "Country group";
  }

  return "Continent";
}

export function getRegionMetaLabel(region: RegionSearchResult): string {
  if (region.kind === "country") {
    return region.alpha2;
  }

  const noun = region.memberCount === 1 ? "country" : "countries";

  return `${region.memberCount} ${noun}`;
}

export function isRegionSelected(
  region: RegionSearchResult,
  selectedRegion: RegionSearchResult | null,
): boolean {
  return selectedRegion?.id === region.id;
}

export function getVisibleRegionResults(
  results: readonly RegionSearchResult[],
  limit: number,
): readonly RegionSearchResult[] {
  return results.slice(0, limit);
}

export function getOverflowResultCount(
  results: readonly RegionSearchResult[],
  limit: number,
): number {
  return Math.max(results.length - limit, 0);
}
