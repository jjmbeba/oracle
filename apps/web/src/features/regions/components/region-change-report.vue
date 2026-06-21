<script setup lang="ts">
import { computed } from "vue";
import { useChangeReportQuery } from "../../watched-regions/queries";
import type { RegionSearchResult } from "../api";
import { riskLevelLabel } from "../region-ui";
import { formatShortRelativeTime } from "../../signals/format";

const props = defineProps<{
  selectedRegion: RegionSearchResult;
}>();

const regionId = computed(() => props.selectedRegion.id);
const { data, isLoading, isError } = useChangeReportQuery(regionId);

const report = computed(() => data.value);

const newCount = computed(() => report.value?.newSignals.length ?? 0);
const expiredCount = computed(() => report.value?.expiredSignals.length ?? 0);
const severityCount = computed(() => report.value?.severityChanges.length ?? 0);

const riskCell = computed<string>(() => {
  const mv = report.value?.riskMovement;
  if (!mv) return "\u2014";
  const delta = mv.toScore - mv.fromScore;
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta} \u00b7 ${riskLevelLabel(mv.toLevel)}`;
});

const isZeroDelta = computed(() => {
  if (!report.value) return true;
  return (
    newCount.value === 0 &&
    expiredCount.value === 0 &&
    severityCount.value === 0 &&
    !report.value.riskMovement
  );
});
</script>

<template>
  <section class="change-report" aria-label="Latest change report for watched region">
    <header class="report-header">
      <span class="report-label">Change report</span>
      <span v-if="report" class="report-timestamp">{{
        formatShortRelativeTime(report.generatedAt)
      }}</span>
    </header>

    <p v-if="isLoading" class="state-copy">Loading change report&hellip;</p>
    <p v-else-if="isError" class="state-copy state-error">Change report unavailable</p>
    <p v-else-if="!report" class="state-copy">First snapshot in progress</p>

    <template v-else>
      <dl class="delta-grid">
        <div class="delta-cell">
          <dt class="delta-label">New signals</dt>
          <dd class="delta-value" :class="{ empty: newCount === 0 }">{{ newCount }}</dd>
        </div>
        <div class="delta-cell">
          <dt class="delta-label">Expired signals</dt>
          <dd class="delta-value" :class="{ empty: expiredCount === 0 }">{{ expiredCount }}</dd>
        </div>
        <div class="delta-cell">
          <dt class="delta-label">Severity changes</dt>
          <dd class="delta-value" :class="{ empty: severityCount === 0 }">{{ severityCount }}</dd>
        </div>
        <div class="delta-cell">
          <dt class="delta-label">Notable risk movement</dt>
          <dd class="delta-value risk" :class="{ empty: !report.riskMovement }">{{ riskCell }}</dd>
        </div>
      </dl>
      <p v-if="isZeroDelta" class="state-copy">No notable changes since last snapshot</p>
    </template>
  </section>
</template>

<style scoped lang="scss">
@use "../../../styles/variables" as *;

.change-report {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid $border-default;
}

.report-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 10px;
}

.report-label {
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: $text-secondary;
}

.report-timestamp {
  font-size: 10px;
  color: $text-meta;
  font-variant-numeric: tabular-nums;
}

.state-copy {
  margin: 0;
  font-size: 11px;
  color: $text-muted;
  line-height: 1.4;
}

.state-copy.state-error {
  color: $text-alert;
}

.delta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  margin: 0;
  border: 1px solid $border-default;
  border-width: 1px 0 0 1px;
}

.delta-cell {
  padding: 10px 6px;
  border: 1px solid $border-default;
  border-width: 0 1px 1px 0;
  text-align: center;
}

.delta-label {
  font-size: 8px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: $text-meta;
  margin: 0 0 4px;
  line-height: 1.2;
}

.delta-value {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: $text-heading;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.delta-value.empty {
  color: $text-muted;
  font-weight: 400;
}

.delta-value.risk {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: $text-heading;
}
</style>
