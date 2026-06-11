<script setup lang="ts">
import { computed } from "vue";
import type { RegionSearchResult } from "../api";
import {
  getOverflowResultCount,
  getRegionKindLabel,
  getRegionMetaLabel,
  getVisibleRegionResults,
  isRegionSelected,
} from "../region-ui";

const VISIBLE_REGION_RESULT_LIMIT = 6;

const searchInput = defineModel<string>("searchInput", { required: true });

const props = defineProps<{
  searchResults: readonly RegionSearchResult[];
  selectedRegion: RegionSearchResult | null;
  normalizedSearchInput: string;
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
  hasSearchText: boolean;
  hasNoMatches: boolean;
}>();

const emit = defineEmits<{
  selectRegion: [region: RegionSearchResult];
}>();

const visibleResults = computed(() =>
  getVisibleRegionResults(props.searchResults, VISIBLE_REGION_RESULT_LIMIT),
);
const overflowResultCount = computed(() =>
  getOverflowResultCount(props.searchResults, VISIBLE_REGION_RESULT_LIMIT),
);

const searchStatusLabel = computed(() => {
  if (props.isError) {
    return "Search unavailable";
  }

  if (props.isFetching) {
    return "Refreshing";
  }

  if (props.hasNoMatches) {
    return "No matches";
  }

  if (props.hasSearchText) {
    return `${props.searchResults.length} matches`;
  }

  return "Default regions";
});

function selectFirstRegion() {
  const [firstRegion] = props.searchResults;

  if (firstRegion) {
    emit("selectRegion", firstRegion);
  }
}
</script>

<template>
  <section class="search-panel" aria-labelledby="region-search-heading">
    <div class="panel-heading">
      <div>
        <p class="panel-label">Region search</p>
        <h2 id="region-search-heading">{{ searchStatusLabel }}</h2>
      </div>
    </div>

    <form class="search-form" role="search" @submit.prevent="selectFirstRegion">
      <label class="sr-only" for="region-search">Search supported regions</label>
      <input
        id="region-search"
        v-model="searchInput"
        type="search"
        autocomplete="off"
        placeholder="Search countries, groups, continents"
      />
      <button type="submit">Go</button>
    </form>

    <p v-if="isError" class="state-copy alert">Region search is temporarily unavailable.</p>
    <p v-else-if="hasNoMatches" class="state-copy">
      No supported region matches "{{ normalizedSearchInput }}".
    </p>
    <p v-else-if="isLoading" class="state-copy">Loading supported regions.</p>

    <div v-else class="result-list">
      <button
        v-for="region in visibleResults"
        :key="region.id"
        class="result-item"
        :class="{ selected: isRegionSelected(region, selectedRegion) }"
        type="button"
        @click="emit('selectRegion', region)"
      >
        <span class="result-main">
          <span class="result-name">{{ region.displayName }}</span>
          <span class="result-kind">{{ getRegionKindLabel(region) }}</span>
        </span>
        <span class="result-meta">{{ getRegionMetaLabel(region) }}</span>
      </button>

      <p v-if="overflowResultCount > 0" class="result-overflow">
        Showing {{ visibleResults.length }} of {{ searchResults.length }}. Keep typing to narrow.
      </p>
    </div>
  </section>
</template>

<style scoped>
.search-panel {
  position: absolute;
  z-index: 5;
  top: 16px;
  left: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: min(360px, calc(100% - 32px));
  padding: 14px;
  border: 1px solid #2a2a2a;
  background: rgba(20, 20, 20, 0.92);
  color: #c0c0c0;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(12px);
}

.panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.panel-label {
  margin: 0 0 5px;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #666;
}

h2 {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: #d0d0d0;
}

.search-form {
  display: flex;
  gap: 8px;
}

input {
  min-width: 0;
  flex: 1;
  height: 34px;
  border: 1px solid #2a2a2a;
  border-radius: 0;
  padding: 0 10px;
  background: #1a1a1a;
  color: #d0d0d0;
  font: inherit;
  font-size: 12px;
  outline: none;
}

input::placeholder {
  color: #666;
}

button {
  border: 1px solid #2a2a2a;
  border-radius: 0;
  background: #202020;
  color: #c0c0c0;
  cursor: pointer;
  font: inherit;
  font-size: 11px;
}

.search-form button {
  width: 48px;
  height: 34px;
}

button:hover,
button:focus-visible,
input:focus-visible {
  border-color: #555;
}

.state-copy {
  margin: 0;
  border: 1px solid #2a2a2a;
  padding: 10px;
  color: #888;
  font-size: 12px;
  line-height: 1.45;
}

.state-copy.alert {
  color: #b87878;
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.result-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 46px;
  padding: 8px 10px;
  text-align: left;
}

.result-item.selected {
  border-color: #4a7c59;
  color: #d0d0d0;
}

.result-main {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.result-name,
.result-kind {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-name {
  color: #d0d0d0;
  font-size: 12px;
}

.result-kind,
.result-meta,
.result-overflow {
  color: #777;
  font-size: 10px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.result-meta {
  flex: 0 0 auto;
}

.result-overflow {
  margin: 2px 0 0;
  line-height: 1.4;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  clip-path: inset(50%);
}

@media (max-width: 640px) {
  .search-panel {
    inset: 12px 12px auto;
    width: auto;
  }
}
</style>
