<script setup lang="ts">
import { computed } from "vue";
import { safeExternalUrl } from "../../../lib/safe-url";

const props = defineProps<{
  title: string;
  severityColor: string;
  severityLabel: string;
  confidence: string;
  provider: string;
  effectiveAtLabel: string;
  sourceLink: { url: string; label?: string } | null;
}>();

const safeHref = computed(() => safeExternalUrl(props.sourceLink?.url));
</script>

<template>
  <div class="signal-popup">
    <div class="popup-title">{{ title }}</div>
    <div class="popup-meta">
      <span class="popup-badge" :style="{ background: severityColor }">{{ severityLabel }}</span>
      <span>{{ confidence }}</span>
      <span>{{ provider }}</span>
      <span>{{ effectiveAtLabel }}</span>
    </div>
    <a
      v-if="sourceLink && safeHref"
      class="popup-source"
      :href="safeHref"
      target="_blank"
      rel="noopener noreferrer"
    >
      {{ sourceLink.label ?? "Open source" }} ↗
    </a>
  </div>
</template>

<style scoped>
.signal-popup {
  font-family: inherit;
  font-size: 12px;
  line-height: 1.4;
  color: #c0c0c0;
}

.popup-title {
  font-weight: 500;
  color: #d0d0d0;
  margin-bottom: 6px;
}

.popup-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: #888;
  flex-wrap: wrap;
}

.popup-badge {
  padding: 1px 5px;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #141414;
}

.popup-source {
  display: inline-block;
  margin-top: 6px;
  font-size: 10px;
  color: #4a7c59;
  text-decoration: none;
}

.popup-source:hover {
  text-decoration: underline;
}
</style>
