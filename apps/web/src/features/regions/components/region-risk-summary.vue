<script setup lang="ts">
import { computed } from "vue";
import { scoreSignals, type RiskLevel } from "@oracle/domain";
import { useRegionActiveSignalsQuery } from "../queries";
import { riskLevelColor, riskLevelLabel } from "../region-ui";
import type { RegionSearchResult } from "../api";

const props = defineProps<{
  selectedRegion: RegionSearchResult;
}>();

const regionId = computed(() => props.selectedRegion.id);
const { data, isLoading, isError } = useRegionActiveSignalsQuery(regionId);

const risk = computed(() => scoreSignals(data.value?.signals ?? []));
const score = computed(() => risk.value.score);
const level = computed<RiskLevel>(() => risk.value.level);
</script>

<template>
  <section class="risk-summary" aria-label="Recent public-signal intensity">
    <header class="risk-header">
      <span class="risk-eyebrow">Risk (informational)</span>
      <span class="risk-value">
        <span class="risk-score">{{ score }}<span class="risk-of">/100</span></span>
        <span class="risk-level">{{ riskLevelLabel(level) }}</span>
      </span>
    </header>
    <div class="risk-bar" :style="{ '--fill': `${score}%`, '--color': riskLevelColor(level) }">
      <div class="risk-bar-fill" />
    </div>
    <p v-if="isLoading" class="state-copy">Loading risk…</p>
    <p v-else-if="isError" class="state-copy state-error">Risk data unavailable</p>
  </section>
</template>

<style scoped lang="scss">
@use "../../../styles/variables" as *;

.risk-summary {
  margin-top: 18px;
  padding-top: 14px;
  animation: fade-in 200ms ease-out;
}

@keyframes fade-in {
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
  .risk-summary {
    animation: none;
  }
}

.risk-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.risk-eyebrow {
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: $text-secondary;
}

.risk-value {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-variant-numeric: tabular-nums;
}

.risk-score {
  font-size: 14px;
  font-weight: 500;
  color: $text-heading;
  line-height: 1;
}

.risk-of {
  font-size: 10px;
  font-weight: 400;
  color: $text-meta;
}

.risk-level {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: $text-meta;
}

.risk-bar {
  height: 6px;
  background: $border-default;
}

.risk-bar-fill {
  width: var(--fill);
  height: 100%;
  background: var(--color, $text-meta);
  transition: width 300ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .risk-bar-fill {
    transition: none;
  }
}

.state-copy {
  margin: 8px 0 0;
  font-size: 11px;
  color: $text-muted;
}

.state-copy.state-error {
  color: $text-alert;
}
</style>
