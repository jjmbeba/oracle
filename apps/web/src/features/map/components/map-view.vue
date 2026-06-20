<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useTemplateRef, watch } from "vue";
import maplibregl from "maplibre-gl";
import { useMapLibre } from "../composables/use-map-libre";
import { useSignalLayerManager } from "../composables/use-signal-layers";
import { useSignalLayerClicks } from "../composables/use-signal-layer-clicks";
import { renderSignalPopup } from "../composables/use-signal-popup";
import { useSignalPulse } from "../composables/use-signal-pulse";
import { useSignalFeedQueries } from "../../signals/queries";
import { formatRelativeTime } from "../../signals/format";
import { SEVERITY_STYLES } from "../../signals/types";
import type { SignalCategory, SignalGeoJsonFeature } from "../../signals/types";
import type { LngLatBounds } from "../../regions/geo-utils";
import { safeExternalUrl } from "../../../lib/safe-url";

const containerRef = useTemplateRef<HTMLDivElement>("map-container");

const { init, destroy, map, isLoaded } = useMapLibre();
const layerManager = useSignalLayerManager(map, isLoaded);

const props = defineProps<{
  activeCategories: readonly SignalCategory[];
  flyTarget?: { bounds: LngLatBounds } | null;
}>();

const emit = defineEmits<{
  signalClick: [lng: number, lat: number];
}>();

const activeCategoriesRef = computed(() => props.activeCategories);
const { allSignals } = useSignalFeedQueries(activeCategoriesRef);

useSignalLayerClicks(
  map,
  isLoaded,
  () => activeCategoriesRef.value,
  (feature) => {
    const [lng, lat] = feature.geometry.coordinates;
    emit("signalClick", lng, lat);
    showPopup(feature);
  },
);

useSignalPulse(map, isLoaded, () => activeCategoriesRef.value);

watch(
  [isLoaded, allSignals, () => props.activeCategories],
  ([loaded, signals, categories]) => {
    if (!loaded) return;
    layerManager.pruneExcept(categories);
    for (const category of categories) {
      const categorySignals = signals.filter((s) => s.category === category);
      layerManager.updateCategoryLayer(category, categorySignals);
    }
  },
  { immediate: true, deep: true },
);

const currentPopup = ref<maplibregl.Popup | null>(null);

function showPopup(feature: SignalGeoJsonFeature): void {
  const m = map.value;
  if (!m) return;

  const [lng, lat] = feature.geometry.coordinates;
  const severityStyle = SEVERITY_STYLES[feature.properties.severity];

  currentPopup.value?.remove();
  currentPopup.value = renderSignalPopup(m, [lng, lat], {
    title: feature.properties.title,
    severityColor: severityStyle.color,
    severityLabel: severityStyle.label,
    confidence: feature.properties.confidence,
    provider: feature.properties.provider,
    effectiveAtLabel: formatRelativeTime(feature.properties.effectiveAt),
    sourceLink: feature.properties.sourceLinkUrl
      ? {
          url: safeExternalUrl(feature.properties.sourceLinkUrl) ?? "",
          label: feature.properties.sourceLinkLabel,
        }
      : null,
  });
}

watch(
  [isLoaded, () => props.flyTarget],
  ([loaded, target]) => {
    const m = map.value;
    if (!loaded || !m || !target) return;
    const bounds: [[number, number], [number, number]] = [
      [target.bounds[0][0], target.bounds[0][1]],
      [target.bounds[1][0], target.bounds[1][1]],
    ];
    m.fitBounds(bounds, { padding: 40, duration: 1200 });
  },
  { immediate: true },
);

onMounted(() => {
  if (!containerRef.value) return;
  init({ container: containerRef.value });
});

onUnmounted(() => {
  currentPopup.value?.remove();
  layerManager.clearAll();
  destroy();
});
</script>

<template>
  <div ref="map-container" class="map-container"></div>
</template>

<style>
.maplibregl-popup-content {
  background: #1a1a1a !important;
  border: 1px solid #2a2a2a !important;
  border-radius: 0 !important;
  padding: 10px 12px !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4) !important;
}

.maplibregl-popup-tip {
  border-top-color: #2a2a2a !important;
}

.maplibregl-popup-close-button {
  font-size: 14px !important;
  color: #666 !important;
  padding: 4px 6px !important;
}

.maplibregl-popup-close-button:hover {
  color: #c0c0c0 !important;
  background: none !important;
}
</style>

<style scoped>
.map-container {
  position: absolute;
  inset: 0;
}
</style>
