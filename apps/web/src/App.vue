<script setup lang="ts">
import { ref } from "vue";
import { useApiHealthStatus } from "./features/health/composables/use-api-health-status";
import MapView from "./features/map/components/map-view.vue";
import type { RegionSearchResult } from "./features/regions/api";
import RegionSearchPanel from "./features/regions/components/region-search-panel.vue";
import SelectedRegionPanel from "./features/regions/components/selected-region-panel.vue";
import AppNavbar from "./layout/components/app-navbar.vue";

const selectedRegion = ref<RegionSearchResult | null>(null);

const { healthState, healthLabel } = useApiHealthStatus();

function selectRegion(region: RegionSearchResult) {
  selectedRegion.value = region;
}
</script>

<template>
  <main class="app-shell">
    <app-navbar :health-state="healthState" :health-label="healthLabel" />

    <div class="map-area">
      <map-view />

      <region-search-panel
        :selected-region="selectedRegion"
        @select-region="selectRegion"
      />

      <selected-region-panel v-if="selectedRegion" :selected-region="selectedRegion" />
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
