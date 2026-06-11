<script setup lang="ts">
import { computed, ref } from "vue";
import type { ApiHealth } from "./features/health/api";
import { useApiHealthQuery } from "./features/health/queries";
import MapView from "./features/map/components/map-view.vue";
import type { RegionSearchResult } from "./features/regions/api";
import RegionSearchPanel from "./features/regions/components/region-search-panel.vue";
import SelectedRegionPanel from "./features/regions/components/selected-region-panel.vue";
import { useRegionSearchQuery } from "./features/regions/queries";

type HealthState = "checking" | "connected" | "unavailable";

const searchInput = ref("");
const selectedRegion = ref<RegionSearchResult | null>(null);

const apiHealthQuery = useApiHealthQuery();
const regionSearchQuery = useRegionSearchQuery(searchInput);

const health = computed<ApiHealth | null>(() => apiHealthQuery.data.value ?? null);
const searchResults = computed<readonly RegionSearchResult[]>(
  () => regionSearchQuery.data.value ?? [],
);
const normalizedSearchInput = computed(() => searchInput.value.trim());
const hasSearchText = computed(() => normalizedSearchInput.value.length > 0);
const hasNoMatches = computed(
  () =>
    hasSearchText.value &&
    regionSearchQuery.isSuccess.value &&
    searchResults.value.length === 0,
);

const healthState = computed<HealthState>(() => {
  if (apiHealthQuery.isSuccess.value && health.value) {
    return "connected";
  }

  if (apiHealthQuery.isError.value) {
    return "unavailable";
  }

  return "checking";
});

const healthLabel = computed(() => {
  if (healthState.value === "connected") {
    return "API connected";
  }

  if (healthState.value === "unavailable") {
    return "API unavailable";
  }

  return "Checking API";
});

function selectRegion(region: RegionSearchResult) {
  selectedRegion.value = region;
}
</script>

<template>
  <main class="app-shell">
    <nav class="navbar">
      <h1 class="navbar-brand">Oracle</h1>
      <span class="navbar-health" :class="healthState">
        <span class="health-dot" aria-hidden="true"></span>
        {{ healthLabel }}
      </span>
    </nav>

    <div class="map-area">
      <map-view />

      <region-search-panel
        v-model:search-input="searchInput"
        :search-results="searchResults"
        :selected-region="selectedRegion"
        :normalized-search-input="normalizedSearchInput"
        :is-error="regionSearchQuery.isError.value"
        :is-fetching="regionSearchQuery.isFetching.value"
        :is-loading="regionSearchQuery.isLoading.value"
        :has-search-text="hasSearchText"
        :has-no-matches="hasNoMatches"
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

.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  min-height: 48px;
  padding: 0 20px;
  background: #141414;
  border-bottom: 1px solid #2a2a2a;
  z-index: 10;
}

.navbar-brand {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #c0c0c0;
  user-select: none;
}

.navbar-health {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  letter-spacing: 0.05em;
  color: #666;
}

.health-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #666;
}

.navbar-health.connected .health-dot {
  background: #4a7c59;
}

.navbar-health.connected {
  color: #4a7c59;
}

.navbar-health.unavailable .health-dot {
  background: #8b4a4a;
}

.navbar-health.unavailable {
  color: #8b4a4a;
}

.map-area {
  position: relative;
  flex: 1;
}

@media (max-width: 640px) {
  .navbar {
    padding: 0 14px;
  }
}
</style>
