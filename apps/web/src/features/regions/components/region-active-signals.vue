<script setup lang="ts">
import { computed } from "vue";
import { useRegionActiveSignalsQuery } from "../queries";
import type { RegionSearchResult } from "../api";
import { SEVERITY_STYLES, type SignalSeverity } from "../../signals/types";
import { formatShortRelativeTime } from "../../signals/format";
import type { SignalFeedItem } from "../../signals/api";
import { safeExternalUrl } from "../../../lib/safe-url";

const props = defineProps<{
  selectedRegion: RegionSearchResult;
}>();

const regionId = computed(() => props.selectedRegion.id);
const { data, isLoading, isError } = useRegionActiveSignalsQuery(regionId);

const signals = computed<readonly SignalFeedItem[]>(() => data.value?.signals ?? []);
const freshness = computed(() => data.value?.freshness ?? []);

type CategoryKey = SignalFeedItem["category"];
type CategoryGroups = ReadonlyArray<{
  readonly category: CategoryKey;
  readonly items: readonly SignalFeedItem[];
  readonly hasFreshness: boolean;
}>;

const groupedByCategory = computed<CategoryGroups>(() => {
  const order: readonly CategoryKey[] = ["earthquake", "weather", "space-weather"];
  const byCategory = new Map<CategoryKey, SignalFeedItem[]>();

  for (const s of signals.value) {
    const list = byCategory.get(s.category) ?? [];
    list.push(s);
    byCategory.set(s.category, list);
  }

  return order.map((category) => {
    const items = byCategory.get(category) ?? [];
    const hasFreshness = freshness.value.some((f) => f.category === category);

    const sorted = [...items].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
    return { category, items: sorted, hasFreshness };
  });
});

const totalCount = computed(() => signals.value.length);
const queryFailed = computed(() => isError.value);

function severityRank(severity: SignalSeverity): number {
  const map: Record<SignalSeverity, number> = {
    extreme: 0,
    severe: 1,
    significant: 2,
    moderate: 3,
    minor: 4,
  };
  return map[severity];
}

function isGlobal(signal: SignalFeedItem): boolean {
  return signal.scope.kind === "global";
}

const safeSourceHref = (sourceLink: SignalFeedItem["sourceLink"]): string | undefined =>
  sourceLink ? safeExternalUrl(sourceLink.url) ?? undefined : undefined;

const CATEGORY_LABEL: Record<CategoryKey, string> = {
  earthquake: "Earthquakes",
  weather: "Weather",
  "space-weather": "Space weather",
};
</script>

<template>
  <section class="active-signals" aria-label="Active signals for selected region">
    <header class="section-header">
      <span class="section-label">Active signals</span>
      <span v-if="!isLoading && totalCount > 0" class="section-count">{{ totalCount }}</span>
    </header>

    <p v-if="isLoading" class="state-copy">Loading active signals...</p>
    <p v-else-if="queryFailed" class="state-copy state-error">Active signals unavailable</p>

    <template v-else>
      <div class="category-groups">
        <article v-for="group in groupedByCategory" :key="group.category" class="category-group">
          <h3 class="category-label">{{ CATEGORY_LABEL[group.category] }}</h3>

          <ol v-if="group.items.length > 0" class="signal-list" role="list">
            <li
              v-for="signal in group.items"
              :key="`${signal.provider}-${signal.effectiveAt}-${signal.title}`"
              class="signal-row"
              :class="{
                'is-global': isGlobal(signal),
                pulse: signal.severity === 'severe' || signal.severity === 'extreme',
              }"
            >
              <span
                class="severity-rail"
                :style="{ backgroundColor: SEVERITY_STYLES[signal.severity].color }"
                :aria-label="SEVERITY_STYLES[signal.severity].label"
              ></span>

              <div class="signal-body">
                <div class="signal-title-row">
                  <span
                    class="severity-tag"
                    :style="{ color: SEVERITY_STYLES[signal.severity].color }"
                  >
                    {{ SEVERITY_STYLES[signal.severity].label }}
                  </span>
                  <a
                    v-if="signal.sourceLink && safeSourceHref(signal.sourceLink)"
                    class="signal-title"
                    :href="safeSourceHref(signal.sourceLink)"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {{ signal.title }}
                  </a>
                  <span v-else class="signal-title">{{ signal.title }}</span>
                  <span v-if="isGlobal(signal)" class="global-eyebrow">Global</span>
                </div>
                <div class="signal-meta">
                  <span class="meta-item">{{ signal.provider }}</span>
                  <span class="meta-sep">·</span>
                  <span class="meta-item">conf {{ signal.confidence }}</span>
                  <span class="meta-sep">·</span>
                  <span class="meta-item">{{ formatShortRelativeTime(signal.effectiveAt) }}</span>
                </div>
              </div>
            </li>
          </ol>
          <p v-else class="category-empty">
            {{
              group.hasFreshness ? "No active signals · past 72h" : "Coverage not yet established"
            }}
          </p>
        </article>
      </div>
    </template>
  </section>
</template>

<style scoped lang="scss">
@use "../../../styles/variables" as *;

.active-signals {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid $border-default;
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
  .active-signals {
    animation: none;
  }
  .signal-row.pulse .severity-rail {
    animation: none;
  }
}

.section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
}

.section-label {
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: $text-secondary;
}

.section-count {
  font-size: 10px;
  color: $text-meta;
  font-variant-numeric: tabular-nums;
}

.state-copy {
  margin: 0;
  font-size: 11px;
  color: $text-muted;
}

.state-copy.state-error {
  color: $text-alert;
}

.category-groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.category-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.category-label {
  margin: 0 0 2px;
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: $text-meta;
  border-bottom: 1px solid $border-default;
  padding-bottom: 3px;
}

.signal-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.category-empty {
  margin: 4px 0 0;
  font-size: 11px;
  color: $text-muted;
  letter-spacing: 0.02em;
}

.signal-row {
  display: flex;
  align-items: stretch;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid #1f1f1f;

  &:last-child {
    border-bottom: none;
  }

  &.is-global {
    opacity: 0.62;
  }
}

.severity-rail {
  flex-shrink: 0;
  width: 3px;
  align-self: stretch;
  background: $text-muted;
  border-radius: 0;
}

.signal-row.pulse .severity-rail {
  animation: rail-pulse 1.5s ease-in-out infinite;
}

@keyframes rail-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}

.signal-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.signal-title-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
  flex-wrap: wrap;
}

.severity-tag {
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-variant-numeric: tabular-nums;
}

.signal-title {
  font-size: 12px;
  color: $text-primary;
  text-decoration: none;
  line-height: 1.35;
  min-width: 0;
  word-break: break-word;

  &:hover {
    color: $text-heading;
    text-decoration: underline;
  }
}

a.signal-title {
  cursor: pointer;
}

.global-eyebrow {
  flex-shrink: 0;
  font-size: 8px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: $text-secondary;
  padding: 1px 4px;
  border: 1px solid $border-default;
  border-radius: 1px;
}

.signal-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: $text-meta;
  font-family: ui-monospace, "SF Mono", "Menlo", monospace;
  font-variant-numeric: tabular-nums;
}

.meta-sep {
  color: $border-default;
}
</style>
