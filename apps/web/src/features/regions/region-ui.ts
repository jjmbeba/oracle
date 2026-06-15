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
