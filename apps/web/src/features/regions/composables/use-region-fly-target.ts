import { computed, ref, type Ref } from "vue";
import { getCountryById } from "@oracle/domain";
import type { CountryId } from "@oracle/domain";
import type { RegionSearchResult } from "../api";
import type { LngLatBounds } from "../geo-utils";
import { estimateBounds, pointToBounds } from "../geo-utils";

export type FlyTarget = { readonly bounds: LngLatBounds };

export type UseRegionFlyTarget = {
  readonly flyTarget: Ref<FlyTarget | null>;
  readonly flyToPoint: (lng: number, lat: number) => void;
  readonly flyToRegion: (region: RegionSearchResult) => void;
  readonly clearOverride: () => void;
};

export function useRegionFlyTarget(
  selectedRegion: Ref<RegionSearchResult | null>,
): UseRegionFlyTarget {
  const override = ref<FlyTarget | null>(null);

  const flyTarget = computed<FlyTarget | null>(() => {
    if (override.value) return override.value;

    return regionBounds(selectedRegion.value);
  });

  function flyToPoint(lng: number, lat: number): void {
    override.value = { bounds: pointToBounds(lng, lat) };
  }

  function flyToRegion(region: RegionSearchResult): void {
    const bounds = regionBounds(region);

    if (bounds) override.value = bounds;
  }

  function clearOverride(): void {
    override.value = null;
  }

  return { flyTarget, flyToPoint, flyToRegion, clearOverride };
}

function regionBounds(region: RegionSearchResult | null): FlyTarget | null {
  if (!region || region.kind !== "country") return null;
  const country = getCountryById(region.id as CountryId);
  if (!country || country.latitude === null || country.longitude === null) return null;
  return {
    bounds: estimateBounds({
      latitude: country.latitude,
      longitude: country.longitude,
      population: null,
      populationDensity: null,
    }),
  };
}
