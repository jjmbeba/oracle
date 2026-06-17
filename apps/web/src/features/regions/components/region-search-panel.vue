<script setup lang="ts">
import { computed, ref } from "vue";
import type { RegionSearchResult } from "../api";
import type { WatchedRegion } from "../../watched-regions/api";
import { useRegionSearchQuery } from "../queries";
import {
  getRegionKindLabel,
  getRegionMetaLabel,
  isRegionSelected,
} from "../region-ui";

const searchInput = ref("");
const watchedOpen = ref(true);

const regionSearchQuery = useRegionSearchQuery(searchInput);

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

const props = defineProps<{
  selectedRegion: RegionSearchResult | null;
  watchedRegions: readonly WatchedRegion[];
}>();

const emit = defineEmits<{
  selectRegion: [region: RegionSearchResult];
  unwatchRegion: [regionId: string];
}>();

const searchStatusLabel = computed(() => {
  if (regionSearchQuery.isError.value) {
    return "Search unavailable";
  }

  if (regionSearchQuery.isFetching.value) {
    return "Refreshing";
  }

  if (hasNoMatches.value) {
    return "No matches";
  }

  if (hasSearchText.value) {
    return `${searchResults.value.length} matches`;
  }

  return "Default regions";
});

function selectFirstRegion() {
  if (regionSearchQuery.isFetching.value) return;

  const [firstRegion] = searchResults.value;

  if (firstRegion) {
    emit("selectRegion", firstRegion);
  }
}

function getWatchedMeta(region: WatchedRegion): string {
  if (!region.region) return "";
  return getRegionMetaLabel(region.region);
}

function getWatchedKind(region: WatchedRegion): string {
  if (!region.region) return "";
  return getRegionKindLabel(region.region);
}
</script>

<template>
  <section class="search-panel" aria-labelledby="region-search-heading">
    <div v-if="watchedRegions.length > 0" class="watched-section">
      <button
        class="watched-header"
        type="button"
        @click="watchedOpen = !watchedOpen"
      >
        <span class="watched-label">
          <span class="watched-count">Watched</span>
          <span class="watched-fraction">{{ watchedRegions.length }} / 10</span>
        </span>
        <span class="watched-toggle">{{ watchedOpen ? "−" : "+" }}</span>
      </button>

      <div v-if="watchedOpen" class="watched-list">
        <button
          v-for="wr in watchedRegions"
          :key="wr.id"
          class="watched-item"
          type="button"
          @click="emit('selectRegion', wr.region ?? undefined!)"
        >
          <span class="watched-item-main">
            <span class="watched-item-name">{{ wr.region?.displayName ?? wr.regionId }}</span>
            <span class="watched-item-kind">{{ getWatchedKind(wr) }}</span>
          </span>
          <span class="watched-item-meta">{{ getWatchedMeta(wr) }}</span>
          <button
            class="unwatch-btn"
            type="button"
            @click.stop="emit('unwatchRegion', wr.regionId)"
            title="Unwatch region"
          >
            &times;
          </button>
        </button>
      </div>
    </div>

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

    <div aria-live="polite">
      <p v-if="regionSearchQuery.isError.value" class="state-copy alert">Region search is temporarily unavailable.</p>
      <p v-else-if="hasNoMatches" class="state-copy">
        No supported region matches "{{ normalizedSearchInput }}".
      </p>
      <p v-else-if="regionSearchQuery.isLoading.value" class="state-copy">Loading supported regions.</p>

      <div v-else class="result-list">
      <button
        v-for="region in searchResults"
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
    </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
@use '../../../styles/variables' as *;

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
  border: 1px solid $border-default;
  background: $bg-panel;
  color: $text-primary;
  box-shadow: $shadow-panel;
  backdrop-filter: blur(12px);

  @media (max-width: 640px) {
    inset: 12px 12px auto;
    width: auto;
  }
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
  color: $text-secondary;
}

h2 {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: $text-heading;
}

.search-form {
  display: flex;
  gap: 8px;

  button {
    width: 48px;
    height: 34px;
  }
}

input {
  min-width: 0;
  flex: 1;
  height: 34px;
  border: 1px solid $border-default;
  border-radius: 0;
  padding: 0 10px;
  background: $bg-input;
  color: $text-heading;
  font: inherit;
  font-size: 12px;
  outline: none;

  &::placeholder {
    color: $text-secondary;
  }
}

button {
  border: 1px solid $border-default;
  border-radius: 0;
  background: $bg-button;
  color: $text-primary;
  cursor: pointer;
  font: inherit;
  font-size: 11px;
}

button:hover,
button:focus-visible,
input:focus-visible {
  border-color: $border-hover;
}

.state-copy {
  margin: 0;
  border: 1px solid $border-default;
  padding: 10px;
  color: $text-muted;
  font-size: 12px;
  line-height: 1.45;

  &.alert {
    color: $text-alert;
  }
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 300px;
  min-height: 0;
  overflow-y: auto;
  padding-right: 8px;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
  transition: scrollbar-color 0.15s;

  &:hover {
    scrollbar-color: $border-hover transparent;
  }

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 3px;
    transition: background 0.15s;
  }

  &:hover::-webkit-scrollbar-thumb {
    background: $border-hover;

    &:hover {
      background: #777;
    }
  }
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

  &.selected {
    border-color: $accent-green;
    color: $text-heading;
  }
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
  color: $text-heading;
  font-size: 12px;
}

.result-kind,
.result-meta {
  color: $text-meta;
  font-size: 10px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.result-meta {
  flex: 0 0 auto;
}

.watched-section {
  display: flex;
  flex-direction: column;
  padding-bottom: 12px;
  border-bottom: 1px solid $border-default;
}

.watched-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0;
  border: none;
  background: none;
  color: $text-primary;
  cursor: pointer;
  font: inherit;
  text-align: left;

  &:hover {
    color: $text-heading;
  }
}

.watched-label {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.watched-count {
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: $text-secondary;
}

.watched-fraction {
  font-size: 11px;
  color: $text-meta;
}

.watched-toggle {
  font-size: 14px;
  color: $text-meta;
  line-height: 1;
}

.watched-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
}

.watched-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border: 1px solid transparent;
  background: none;
  color: $text-primary;
  cursor: pointer;
  font: inherit;
  text-align: left;

  &:hover {
    border-color: $border-hover;
  }
}

.watched-item-main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.watched-item-name {
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: $text-heading;
}

.watched-item-kind,
.watched-item-meta {
  font-size: 10px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: $text-meta;
}

.unwatch-btn {
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  border: 1px solid $border-default;
  padding: 0;
  background: $bg-button;
  color: $text-muted;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;

  &:hover {
    border-color: $accent-red;
    color: $accent-red;
  }
}
</style>
