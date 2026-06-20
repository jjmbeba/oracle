import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { useWatchedRegionControl } from "./use-watched-region-control";
import type { RegionSearchResult } from "../api";
import type { WatchedRegion } from "../../watched-regions/api";
import { MAX_WATCHED_REGIONS } from "../../watched-regions/api";

const kenya: RegionSearchResult = {
  id: "country:ke",
  kind: "country",
  displayName: "Kenya",
  alpha2: "KE",
};

const japan: RegionSearchResult = {
  id: "country:jp",
  kind: "country",
  displayName: "Japan",
  alpha2: "JP",
};

const watched = (regionId: string, region: RegionSearchResult | null = null): WatchedRegion => ({
  id: `wr-${regionId}`,
  regionId,
  region,
  createdAt: "2026-01-01T00:00:00.000Z",
});

describe("useWatchedRegionControl", () => {
  it("returns false for an unwatched region", () => {
    const selectedRegion = ref<RegionSearchResult | null>(kenya);
    const watchedRegions = ref<readonly WatchedRegion[]>([]);

    const { isWatched, watchDisabledReason } = useWatchedRegionControl(selectedRegion, watchedRegions);
    expect(isWatched.value).toBe(false);
    expect(watchDisabledReason.value).toBeNull();
  });

  it("returns true when the region is already watched", () => {
    const selectedRegion = ref<RegionSearchResult | null>(kenya);
    const watchedRegions = ref<readonly WatchedRegion[]>([watched("country:ke", kenya)]);

    const { isWatched, watchDisabledReason } = useWatchedRegionControl(selectedRegion, watchedRegions);
    expect(isWatched.value).toBe(true);
    expect(watchDisabledReason.value).toBeNull();
  });

  it("returns a disabled reason when the limit is reached", () => {
    const selectedRegion = ref<RegionSearchResult | null>(japan);
    const watchedRegions = ref<readonly WatchedRegion[]>(
      Array.from({ length: MAX_WATCHED_REGIONS }, (_, i) =>
        watched(`country:k${i.toString().padStart(2, "0")}`),
      ),
    );

    const { isWatched, watchDisabledReason } = useWatchedRegionControl(selectedRegion, watchedRegions);
    expect(isWatched.value).toBe(false);
    expect(watchDisabledReason.value).toBe(`Maximum ${MAX_WATCHED_REGIONS} regions watched`);
  });

  it("returns no reason while under the limit", () => {
    const selectedRegion = ref<RegionSearchResult | null>(kenya);
    const watchedRegions = ref<readonly WatchedRegion[]>([
      watched("country:ke", kenya),
      watched("country:jp", japan),
    ]);

    const { isWatched, watchDisabledReason } = useWatchedRegionControl(selectedRegion, watchedRegions);
    expect(isWatched.value).toBe(true);
    expect(watchDisabledReason.value).toBeNull();
  });
});
