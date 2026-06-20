<script setup lang="ts">
import { computed, toRef } from "vue";
import { useSignalFeedQueries } from "../queries";
import { formatFeedFreshness, formatShortRelativeTime } from "../format";
import { SEVERITY_STYLES, SEVERITY_ORDER } from "../types";
import type { SignalCategory } from "../types";
import type { SignalFeedItem } from "../api";

const props = defineProps<{
  activeCategories: readonly SignalCategory[];
}>();

const emit = defineEmits<{
  signalClick: [lng: number, lat: number];
}>();

const { results, allSignals, isLoadingAny } = useSignalFeedQueries(
  toRef(props, "activeCategories"),
);

const sortedSignals = computed<readonly SignalFeedItem[]>(() =>
  [...allSignals.value].sort((a, b) => {
    const sa = SEVERITY_ORDER[a.severity];
    const sb = SEVERITY_ORDER[b.severity];
    if (sa !== sb) return sa - sb;
    return new Date(b.effectiveAt).getTime() - new Date(a.effectiveAt).getTime();
  }),
);

const allFreshness = computed(() => results.value.flatMap((r) => r.data?.freshness ?? []));

const latestFreshnessTime = computed(() => {
  const timestamps = allFreshness.value
    .map((f) => new Date(f.lastSuccessfulPollAt).getTime())
    .filter((t) => !Number.isNaN(t));
  return timestamps.length > 0 ? Math.max(...timestamps) : null;
});

const freshnessLabel = computed(() => {
  const ts = latestFreshnessTime.value;
  if (!ts) return null;
  return formatFeedFreshness(new Date(ts).toISOString());
});

function handleItemClick(signal: SignalFeedItem) {
  if (signal.scope.kind !== "point") return;
  const [lng, lat] = signal.scope.coordinates;
  emit("signalClick", lng, lat);
}
</script>

<template>
  <section class="feed" aria-label="Signal feed">
    <div class="feed-header">
      <span class="feed-label">Feed</span>
      <span v-if="freshnessLabel" class="feed-freshness">{{ freshnessLabel }}</span>
    </div>

    <div v-if="isLoadingAny" class="feed-state">Loading signals...</div>

    <div v-else-if="sortedSignals.length === 0" class="feed-state">No active signals</div>

    <div v-else class="feed-items" role="list">
      <button
        v-for="(signal, idx) in sortedSignals"
        :key="`${signal.provider}-${signal.effectiveAt}-${idx}`"
        class="feed-item"
        role="listitem"
        type="button"
        :title="signal.title"
        @click="handleItemClick(signal)"
      >
        <span
          class="item-badge"
          :style="{ backgroundColor: SEVERITY_STYLES[signal.severity].color }"
        >
          {{ SEVERITY_STYLES[signal.severity].label }}
        </span>
        <span class="item-title">{{ signal.title }}</span>
        <span class="item-meta">
          <span v-if="signal.sourceLink?.label" class="item-source">{{
            signal.sourceLink.label
          }}</span>
          <span class="item-time">{{ formatShortRelativeTime(signal.effectiveAt) }}</span>
        </span>
      </button>
    </div>
  </section>
</template>

<style scoped lang="scss">
@use "../../../styles/variables" as *;

.feed {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 44px;
  min-height: 44px;
  padding: 0 14px;
  border-top: 1px solid $border-default;
  background: $bg-panel;
  backdrop-filter: blur(12px);
}

.feed-header {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex-shrink: 0;
}

.feed-label {
  font-size: 9px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: $text-secondary;
}

.feed-freshness {
  font-size: 9px;
  color: $text-meta;
  white-space: nowrap;
}

.feed-state {
  font-size: 11px;
  color: $text-muted;
}

.feed-items {
  display: flex;
  gap: 6px;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 4px 0;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;

  &:hover {
    scrollbar-color: $border-hover transparent;
  }

  &::-webkit-scrollbar {
    height: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 2px;
    transition: background 0.15s;
  }

  &:hover::-webkit-scrollbar-thumb {
    background: $border-hover;
  }
}

.feed-item {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  max-width: 260px;
  padding: 4px 8px;
  border: 1px solid $border-default;
  background: $bg-button;
  color: $text-primary;
  cursor: pointer;
  font: inherit;
  font-size: 11px;
  line-height: 1.3;
  text-align: left;
  transition: border-color 0.15s;

  &:hover {
    border-color: $border-hover;
  }
}

.item-badge {
  flex-shrink: 0;
  padding: 1px 5px;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #141414;
}

.item-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  flex: 1;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  font-size: 10px;
  color: $text-meta;
  white-space: nowrap;
}

.item-source {
  color: $text-muted;
}
</style>
