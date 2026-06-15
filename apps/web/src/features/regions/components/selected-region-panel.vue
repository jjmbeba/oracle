<script setup lang="ts">
import type { RegionSearchResult } from "../api";
import { getRegionKindLabel, getRegionMetaLabel } from "../region-ui";

defineProps<{
  selectedRegion: RegionSearchResult;
}>();
</script>

<template>
  <section class="selected-panel" aria-live="polite">
    <p class="panel-label">Selected region</p>
    <h2>{{ selectedRegion.displayName }}</h2>
    <div class="selected-meta">
      <span>{{ getRegionKindLabel(selectedRegion) }}</span>
      <span>{{ getRegionMetaLabel(selectedRegion) }}</span>
    </div>
  </section>
</template>

<style scoped>
.selected-panel {
  position: absolute;
  z-index: 5;
  right: 16px;
  bottom: 16px;
  width: min(280px, calc(100% - 32px));
  padding: 14px;
  border: 1px solid #2a2a2a;
  background: rgba(20, 20, 20, 0.92);
  color: #c0c0c0;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(12px);
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

.selected-meta {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  color: #777;
  font-size: 10px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

@media (max-width: 640px) {
  .selected-panel {
    right: 12px;
    bottom: 12px;
    left: 12px;
    width: auto;
  }
}
</style>
