<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useApiHealthStatus } from "./features/health/composables/use-api-health-status";
import MapView from "./features/map/components/map-view.vue";
import type { RegionSearchResult } from "./features/regions/api";
import RegionSearchPanel from "./features/regions/components/region-search-panel.vue";
import SelectedRegionPanel from "./features/regions/components/selected-region-panel.vue";
import AppNavbar from "./layout/components/app-navbar.vue";
import { useAnonymousSession } from "./composables/use-anonymous-session";
import {
  useWatchedRegionsQuery,
  useWatchRegionMutation,
  useUnwatchRegionMutation,
} from "./features/watched-regions/queries";

const selectedRegion = ref<RegionSearchResult | null>(null);

const { healthState, healthLabel } = useApiHealthStatus();
const { authState, initialize } = useAnonymousSession();
const { data: watchedRegions } = useWatchedRegionsQuery(
  computed(() => authState.value === "authenticated"),
);
const { mutate: doWatch } = useWatchRegionMutation();
const { mutate: doUnwatch } = useUnwatchRegionMutation();

onMounted(() => {
  initialize();
});

function selectRegion(region: RegionSearchResult) {
  selectedRegion.value = region;
}

const selectedIsWatched = computed(() => {
  if (!selectedRegion.value) return false;
  return watchedRegions.value?.some((wr) => wr.regionId === selectedRegion.value!.id) ?? false;
});

const watchDisabledReason = computed<string | null>(() => {
  if (!selectedRegion.value) return null;
  if (selectedIsWatched.value) return null;
  if ((watchedRegions.value?.length ?? 0) >= 10) return "Maximum 10 regions watched";
  return null;
});

function handleWatch() {
  if (!selectedRegion.value) return;
  doWatch(selectedRegion.value.id);
}

function handleUnwatch() {
  if (!selectedRegion.value) return;
  doUnwatch(selectedRegion.value.id);
}

function handleUnwatchRegion(regionId: string) {
  doUnwatch(regionId);
}
</script>

<template>
  <main class="app-shell">
    <app-navbar :health-state="healthState" :health-label="healthLabel" />

    <div class="map-area">
      <map-view />

      <region-search-panel
        :selected-region="selectedRegion"
        :watched-regions="watchedRegions ?? []"
        @select-region="selectRegion"
        @unwatch-region="handleUnwatchRegion"
      />

      <selected-region-panel
        v-if="selectedRegion"
        :selected-region="selectedRegion"
        :is-watched="selectedIsWatched"
        :watch-disabled-reason="watchDisabledReason"
        @watch="handleWatch"
        @unwatch="handleUnwatch"
      />
    </div>
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
</style>
