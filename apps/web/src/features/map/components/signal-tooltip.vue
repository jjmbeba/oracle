<script setup lang="ts">
defineProps<{
  title: string;
  severityLabel: string;
  severityColor: string;
  provider: string;
  effectiveAtLabel: string;
}>();
</script>

<template>
  <div class="signal-tooltip">
    <div class="tooltip-title">
      <span class="tooltip-severity" :style="{ color: severityColor }">{{ severityLabel }}</span>
      <span class="tooltip-text">{{ title }}</span>
    </div>
    <div class="tooltip-meta">
      <span>{{ provider }}</span>
      <span class="tooltip-sep">·</span>
      <span>{{ effectiveAtLabel }}</span>
    </div>
  </div>
</template>

<style scoped>
.signal-tooltip {
  font-family: inherit;
  font-size: 12px;
  line-height: 1.35;
  color: #c0c0c0;
  max-width: 240px;
}

.tooltip-title {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 3px;
}

.tooltip-severity {
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-variant-numeric: tabular-nums;
}

.tooltip-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #d0d0d0;
}

.tooltip-meta {
  font-size: 10px;
  color: #888;
  font-family: ui-monospace, "SF Mono", "Menlo", monospace;
  font-variant-numeric: tabular-nums;
  display: flex;
  gap: 4px;
}

.tooltip-sep {
  color: #555;
}
</style>
