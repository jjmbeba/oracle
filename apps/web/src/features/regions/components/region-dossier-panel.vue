<script setup lang="ts">
import { computed } from "vue";
import { scoreSignals, type NormalizedSignal } from "@oracle/domain";
import { useRegionDossierQuery, useRegionActiveSignalsQuery } from "../queries";
import type { RegionSearchResult } from "../api";
import type { SignalFeedItem } from "../../signals/api";
import {
  getRegionKindLabel,
  getRegionMetaLabel,
  buildOverviewFactRows,
  buildDossierStatusStrip,
  type FactRow,
} from "../region-ui";
import RegionActiveSignals from "./region-active-signals.vue";
import RegionChangeReport from "./region-change-report.vue";
import RegionRiskSummary from "./region-risk-summary.vue";

// ponytail: API projection omits dedupeKey; the shape is structurally compatible.
const asScorable = (signals: readonly SignalFeedItem[]): readonly NormalizedSignal[] =>
  signals as readonly NormalizedSignal[];

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
const { data: activeData } = useRegionActiveSignalsQuery(regionId);

const factRows = computed<readonly FactRow[]>(() => {
  const d = dossierData.value;
  if (!d?.overviewFacts) return [];
  return buildOverviewFactRows(d.overviewFacts, d.region.kind);
});

const factSourceLabels = computed<readonly string[]>(
  () => dossierData.value?.factSources.map((s) => s.label) ?? [],
);

const statusSegments = computed<readonly string[]>(() => {
  const signals = activeData.value?.signals ?? [];
  const freshnessTimestamps = (activeData.value?.freshness ?? [])
    .map((f) => new Date(f.lastSuccessfulPollAt).getTime())
    .filter((t) => !Number.isNaN(t));
  const lastUpdatedAt =
    freshnessTimestamps.length > 0
      ? new Date(Math.max(...freshnessTimestamps)).toISOString()
      : null;
  const { score, level } = scoreSignals(asScorable(signals));

  return buildDossierStatusStrip({
    regionLabel: props.selectedRegion.displayName,
    isWatched: props.isWatched,
    activeCount: signals.length,
    lastUpdatedAt,
    riskScore: score,
    riskLevel: level,
  });
});
</script>

<template>
  <section class="dossier-panel" aria-live="polite">
    <div class="dossier-status-strip" aria-label="Region status summary">
      <span
        v-for="(segment, idx) in statusSegments"
        :key="`${idx}-${segment}`"
        class="status-segment"
        :class="{ accent: idx === 0 }"
      >
        {{ segment }}
      </span>
    </div>

    <header class="dossier-header">
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
    </header>

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
  width: 360px;
  display: flex;
  flex-direction: column;
  border: 1px solid $border-default;
  background: $bg-panel;
  color: $text-primary;
  box-shadow: $shadow-panel;
  backdrop-filter: blur(12px);
  padding: 0;
  animation: dossier-in 200ms ease-out;
}

@keyframes dossier-in {
  from {
    opacity: 0;
    transform: translateY(2px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .dossier-panel {
    animation: none;
  }
}

.dossier-status-strip {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0 6px;
  padding: 8px 14px;
  border-bottom: 1px solid $border-default;
  background: rgba(0, 0, 0, 0.25);
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: $text-meta;
  font-variant-numeric: tabular-nums;
}

.status-segment {
  display: inline-flex;
  align-items: center;

  & + &::before {
    content: "·";
    margin-right: 6px;
    color: $text-muted;
  }

  &.accent {
    color: $ink;
    font-weight: 500;
  }
}

.dossier-header {
  flex-shrink: 0;
  padding: 14px;
  border-bottom: 1px solid $border-default;
}

.dossier-title-area {
  margin-bottom: 10px;
}

.panel-label {
  margin: 0 0 5px;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: $text-secondary;
}

.title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: $text-heading;
  line-height: 1.3;
  letter-spacing: -0.01em;
}

.close-btn {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  background: transparent;
  color: $text-meta;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;

  &:hover {
    color: $text-heading;
    border-color: $border-default;
  }
}

.region-meta {
  display: flex;
  gap: 10px;
  margin-top: 6px;
  color: $text-meta;
  font-size: 10px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.watch-btn {
  width: 100%;
  padding: 7px 0;
  border: 1px solid $border-default;
  background: $bg-button;
  color: $text-primary;
  cursor: pointer;
  font: inherit;
  font-size: 11px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.watch-btn:hover:not(:disabled) {
  border-color: $border-hover;
}

.watch-btn:disabled {
  opacity: 0.4;
  cursor: default;
  color: $text-muted;
}

.watch-btn.watching {
  border-color: $ink;
  color: $ink;
}

.dossier-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 14px 14px;
  @include thin-hover-scrollbar;
}

.state-copy {
  margin: 0;
  font-size: 12px;
  color: $text-muted;
}

.fact-list {
  margin: 0;
}

.fact-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 7px 0;
  border-bottom: 1px solid #1f1f1f;
}

.fact-row:last-child {
  border-bottom: none;
}

.fact-label {
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: $text-secondary;
}

.fact-value {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.fact-text {
  font-size: 12px;
  color: $text-primary;
  line-height: 1.4;
}

.fact-source {
  font-size: 10px;
  color: $text-meta;
}

.fact-attribution {
  margin: 10px 0 0;
  font-size: 10px;
  color: $text-secondary;
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
