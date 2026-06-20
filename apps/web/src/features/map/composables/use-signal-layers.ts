import type { Ref } from "vue";
import type { GeoJSONSource, Map } from "maplibre-gl";
import type { SignalFeedItem } from "../../signals/api";
import { signalFeedToGeoJson, SEVERITY_STYLES } from "../../signals/types";
import { SIGNAL_LAYER_PREFIX, signalLayerId, signalSourceId } from "./signal-layer-ids";
import type { SignalCategory } from "../../signals/types";

type SeverityField = "radius" | "opacity" | "color";

const matchExpression = (field: SeverityField, fallback: number | string) => [
  "match",
  ["get", "severity"],
  ...Object.entries(SEVERITY_STYLES).flatMap(([k, s]) => [k, s[field]]),
  fallback,
];

const STROKE_BY_SEVERITY: Record<string, number> = Object.fromEntries(
  Object.entries(SEVERITY_STYLES).map(([k, s]) => [k, s.radius >= 13 ? 1 : 0.5]),
);

const strokeMatchExpression = [
  "match",
  ["get", "severity"],
  ...Object.entries(STROKE_BY_SEVERITY).flatMap(([k, v]) => [k, v]),
  0,
];

export type SignalLayerManager = {
  readonly updateCategoryLayer: (
    category: SignalCategory,
    signals: readonly SignalFeedItem[],
  ) => void;
  readonly removeCategoryLayer: (category: SignalCategory) => void;
  readonly clearAll: () => void;
};

export function useSignalLayerManager(
  map: Ref<Map | null>,
  isLoaded: Ref<boolean>,
): SignalLayerManager {
  function updateCategoryLayer(
    category: SignalCategory,
    signals: readonly SignalFeedItem[],
  ): void {
    const m = map.value;
    if (!m || !isLoaded.value) return;

    const sid = signalSourceId(category);
    const lid = signalLayerId(category);
    const geojson = signalFeedToGeoJson(signals);

    if (m.getSource(sid)) {
      (m.getSource(sid) as GeoJSONSource).setData(geojson);
      return;
    }

    if (geojson.features.length === 0) return;

    m.addSource(sid, { type: "geojson", data: geojson });

    m.addLayer({
      id: lid,
      source: sid,
      type: "circle",
      paint: {
        "circle-radius": matchExpression("radius", 4) as never,
        "circle-opacity": matchExpression("opacity", 0.4) as never,
        "circle-color": matchExpression("color", SEVERITY_STYLES.minor.color) as never,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": strokeMatchExpression as never,
        "circle-stroke-opacity": 0.25,
      },
    });
  }

  function removeCategoryLayer(category: SignalCategory): void {
    const m = map.value;
    if (!m) return;

    const lid = signalLayerId(category);
    const sid = signalSourceId(category);

    if (m.getLayer(lid)) m.removeLayer(lid);
    if (m.getSource(sid)) m.removeSource(sid);
  }

  function clearAll(): void {
    const m = map.value;
    if (!m) return;

    const layers = m.getStyle().layers ?? [];
    for (const layer of layers) {
      if (layer.id.startsWith(`${SIGNAL_LAYER_PREFIX}-circle-`)) {
        m.removeLayer(layer.id);
      }
    }

    const sources = Object.keys(m.getStyle().sources ?? {});
    for (const sourceId of sources) {
      if (sourceId.startsWith(`${SIGNAL_LAYER_PREFIX}-`)) {
        m.removeSource(sourceId);
      }
    }
  }

  return { updateCategoryLayer, removeCategoryLayer, clearAll };
}
