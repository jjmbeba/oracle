import { ref, type Ref } from "vue";
import type { RegionSearchResult } from "../api";
import { findNearestCountry } from "../geo-utils";

export type UseSelectedRegion = {
  readonly selectedRegion: Ref<RegionSearchResult | null>;
  readonly selectRegion: (region: RegionSearchResult) => void;
  readonly clearSelectedRegion: () => void;
  readonly selectFromPoint: (lng: number, lat: number) => void;
};

export function useSelectedRegion(): UseSelectedRegion {
  const selectedRegion = ref<RegionSearchResult | null>(null);

  function selectRegion(region: RegionSearchResult): void {
    selectedRegion.value = region;
  }

  function clearSelectedRegion(): void {
    selectedRegion.value = null;
  }

  function selectFromPoint(lng: number, lat: number): void {
    const country = findNearestCountry(lat, lng);
    if (!country) return;
    selectedRegion.value = {
      id: country.id,
      kind: "country",
      displayName: country.displayName,
      alpha2: country.alpha2,
    };
  }

  return {
    selectedRegion,
    selectRegion,
    clearSelectedRegion,
    selectFromPoint,
  };
}
