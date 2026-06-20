import { computed, type Ref } from "vue";
import type { RegionSearchResult } from "../api";
import type { WatchedRegion } from "../../watched-regions/api";
import { MAX_WATCHED_REGIONS } from "../../watched-regions/api";

export type UseWatchedRegionControl = {
  readonly isWatched: Ref<boolean>;
  readonly watchDisabledReason: Ref<string | null>;
};

export function useWatchedRegionControl(
  selectedRegion: Ref<RegionSearchResult | null>,
  watchedRegions: Ref<readonly WatchedRegion[]>,
): UseWatchedRegionControl {
  const isWatched = computed<boolean>(() => {
    const region = selectedRegion.value;
    if (!region) return false;

    return watchedRegions.value.some((wr) => wr.regionId === region.id);
  });

  const watchDisabledReason = computed<string | null>(() => {
    if (!selectedRegion.value) return null;
    if (isWatched.value) return null;

    if (watchedRegions.value.length >= MAX_WATCHED_REGIONS) {
      return `Maximum ${MAX_WATCHED_REGIONS} regions watched`;
    }

    return null;
  });

  return { isWatched, watchDisabledReason };
}
