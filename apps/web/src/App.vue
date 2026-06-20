<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useApiHealthStatus } from "./features/health/composables/use-api-health-status";
import MapView from "./features/map/components/map-view.vue";
import RegionSearchPanel from "./features/regions/components/region-search-panel.vue";
import RegionDossierPanel from "./features/regions/components/region-dossier-panel.vue";
import SignalCategoryToggles from "./features/signals/components/signal-category-toggles.vue";
import SignalFeed from "./features/signals/components/signal-feed.vue";
import AppNavbar from "./layout/components/app-navbar.vue";
import { useAnonymousSession } from "./composables/use-anonymous-session";
import { useSelectedRegion } from "./features/regions/composables/use-selected-region";
import { useRegionFlyTarget } from "./features/regions/composables/use-region-fly-target";
import { useWatchedRegionControl } from "./features/regions/composables/use-watched-region-control";
import type { RegionSearchResult } from "./features/regions/api";
import type { WatchedRegion } from "./features/watched-regions/api";
import {
  useWatchedRegionsQuery,
  useWatchRegionMutation,
  useUnwatchRegionMutation,
} from "./features/watched-regions/queries";
import type { SignalCategory } from "./features/signals/types";

const { selectedRegion, selectRegion, clearSelectedRegion, selectFromPoint } = useSelectedRegion();
const activeCategories = ref<SignalCategory[]>(["earthquake", "space-weather"]);

const { healthState, healthLabel } = useApiHealthStatus();
const { authState, initialize } = useAnonymousSession();
const { data: watchedRegions } = useWatchedRegionsQuery(
  computed(() => authState.value === "authenticated"),
);
const { mutate: doWatch } = useWatchRegionMutation();
const { mutate: doUnwatch } = useUnwatchRegionMutation();

const watchedRegionsForControl = computed<readonly WatchedRegion[]>(
  () => watchedRegions.value ?? [],
);

const { flyTarget, flyToPoint, clearOverride } = useRegionFlyTarget(selectedRegion);
const { isWatched, watchDisabledReason } = useWatchedRegionControl(
  selectedRegion,
  watchedRegionsForControl,
);

onMounted(() => {
  initialize();
});

function selectRegionWithReset(region: RegionSearchResult): void {
  clearOverride();
  selectRegion(region);
}

function handleSignalClick(lng: number, lat: number): void {
  flyToPoint(lng, lat);
  selectFromPoint(lng, lat);
}

function handleWatch(): void {
  if (!selectedRegion.value) return;

  doWatch(selectedRegion.value.id);
}

function handleUnwatch(): void {
  if (!selectedRegion.value) return;

  doUnwatch(selectedRegion.value.id);
}

function handleUnwatchRegion(regionId: string): void {
  doUnwatch(regionId);
}
</script>

<template>
  <main class="app-shell">
    <app-navbar :health-state="healthState" :health-label="healthLabel" />

    <div class="map-area">
      <map-view
        :active-categories="activeCategories"
        :fly-target="flyTarget"
        @signal-click="handleSignalClick"
      />

      <region-search-panel
        :selected-region="selectedRegion"
        :watched-regions="watchedRegions ?? []"
        @select-region="selectRegionWithReset"
        @unwatch-region="handleUnwatchRegion"
      />

      <region-dossier-panel
        v-if="selectedRegion"
        :selected-region="selectedRegion"
        :is-watched="isWatched"
        :watch-disabled-reason="watchDisabledReason"
        @close="clearSelectedRegion"
        @watch="handleWatch"
        @unwatch="handleUnwatch"
      />

      <div class="toggles-area">
        <signal-category-toggles v-model:active-categories="activeCategories" />
      </div>
    </div>

    <signal-feed :active-categories="activeCategories" @signal-click="handleSignalClick" />
  </main>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: #141414;
}

.map-area {
  position: relative;
  flex: 1;
}

.toggles-area {
  position: absolute;
  z-index: 5;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
}
</style>
