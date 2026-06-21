<script setup lang="ts">
import { useRegionDossierQuery } from "../queries";
import type { RegionSearchResult } from "../api";
import {
  getRegionKindLabel,
  getRegionMetaLabel,
  buildOverviewFactRows,
  type FactRow,
} from "../region-ui";
import RegionActiveSignals from "./region-active-signals.vue";
import RegionChangeReport from "./region-change-report.vue";
import RegionRiskSummary from "./region-risk-summary.vue";
import { computed } from "vue";

const props = defineProps<{
  selectedRegion: RegionSearchResult;
  isWatched: boolean;
  watchDisabledReason: string | null;
}>();

const emit = defineEmits<{
  close: [];
  watch: [];
  unwatch: [];
}>();

const regionId = computed(() => props.selectedRegion.id);
const { data: dossierData, isLoading } = useRegionDossierQuery(regionId);

const factRows = computed<readonly FactRow[]>(() => {
  const d = dossierData.value;
  if (!d?.overviewFacts) return [];
  return buildOverviewFactRows(d.overviewFacts, d.region.kind);
});

const factSourceLabels = computed<readonly string[]>(
  () => dossierData.value?.factSources.map((s) => s.label) ?? [],
);
</script>

<template>
  <section class="dossier-panel" aria-live="polite">
    <div class="dossier-header">
      <div class="dossier-title-area">
        <p class="panel-label">Selected region</p>
        <div class="title-row">
          <h2>{{ selectedRegion.displayName }}</h2>
          <button class="close-btn" type="button" aria-label="Close dossier" @click="emit('close')">
            &times;
          </button>
        </div>
        <div class="region-meta">
          <span>{{ getRegionKindLabel(selectedRegion) }}</span>
          <span>{{ getRegionMetaLabel(selectedRegion) }}</span>
        </div>
      </div>

      <button v-if="isWatched" class="watch-btn watching" type="button" @click="emit('unwatch')">
        Unwatch region
      </button>
      <button
        v-else
        class="watch-btn"
        type="button"
        :disabled="!!watchDisabledReason"
        :title="watchDisabledReason ?? ''"
        @click="emit('watch')"
      >
        {{ watchDisabledReason ?? "Watch region" }}
      </button>
    </div>

    <div class="dossier-body">
      <p v-if="isLoading" class="state-copy">Loading facts...</p>
      <p v-else-if="!dossierData" class="state-copy">No dossier data available</p>
      <p v-else-if="!dossierData.overviewFacts" class="state-copy">
        No overview facts available for this region
      </p>
      <dl v-else class="fact-list">
        <div v-for="row in factRows" :key="row.label" class="fact-row">
          <dt class="fact-label">{{ row.label }}</dt>
          <dd class="fact-value">
            <span class="fact-text">{{ row.value }}</span>
          </dd>
        </div>
      </dl>

      <p v-if="factSourceLabels.length > 0" class="fact-attribution">
        Sources: {{ factSourceLabels.join(", ") }}
      </p>

      <region-risk-summary :selected-region="selectedRegion" />

      <region-active-signals :selected-region="selectedRegion" />

      <region-change-report v-if="isWatched" :selected-region="selectedRegion" />
    </div>
  </section>
</template>

<style scoped lang="scss">
@use "../../../styles/variables" as *;
@use "../../../styles/scrollbar" as *;

.dossier-panel {
  position: absolute;
  z-index: 5;
  right: 16px;
  top: 16px;
  bottom: 16px;
  width: 320px;
  display: flex;
  flex-direction: column;
  border: 1px solid #2a2a2a;
  background: rgba(20, 20, 20, 0.92);
  color: #c0c0c0;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(12px);
  padding: 14px;
}

.dossier-header {
  flex-shrink: 0;
  padding-bottom: 14px;
  border-bottom: 1px solid #2a2a2a;
}

.dossier-title-area {
  margin-bottom: 10px;
}

.panel-label {
  margin: 0 0 5px;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #666;
}

.title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

h2 {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: #d0d0d0;
  line-height: 1.4;
}

.close-btn {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #2a2a2a;
  background: #202020;
  color: #888;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
}

.close-btn:hover {
  border-color: #555;
  color: #c0c0c0;
}

.region-meta {
  display: flex;
  gap: 10px;
  margin-top: 8px;
  color: #777;
  font-size: 10px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.watch-btn {
  width: 100%;
  padding: 8px 0;
  border: 1px solid #2a2a2a;
  background: #202020;
  color: #c0c0c0;
  cursor: pointer;
  font: inherit;
  font-size: 11px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.watch-btn:hover:not(:disabled) {
  border-color: #555;
}

.watch-btn:disabled {
  opacity: 0.4;
  cursor: default;
  color: #888;
}

.watch-btn.watching {
  border-color: #4a7c59;
  color: #4a7c59;
}

.dossier-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 20px;
  @include thin-hover-scrollbar;
}

.state-copy {
  margin: 0;
  font-size: 12px;
  color: #888;
}

.fact-list {
  margin: 0;
}

.fact-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 0;
  border-bottom: 1px solid #222;
}

.fact-row:last-child {
  border-bottom: none;
}

.fact-label {
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #666;
}

.fact-value {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.fact-text {
  font-size: 12px;
  color: #c0c0c0;
  line-height: 1.4;
}

.fact-source {
  font-size: 10px;
  color: #888;
}

.fact-attribution {
  margin: 12px 0 0;
  font-size: 10px;
  color: #666;
  line-height: 1.5;
}

@media (max-width: 640px) {
  .dossier-panel {
    right: 12px;
    left: 12px;
    top: 12px;
    bottom: 12px;
    width: auto;
  }
}
</style>
