import type { Ref } from "vue";
import type { GeoJSONSource, Map } from "maplibre-gl";
import type { SignalFeedItem } from "../../signals/api";
import { signalFeedToGeoJson, SEVERITY_STYLES, SIGNAL_CATEGORIES } from "../../signals/types";
import {
  SIGNAL_LAYER_PREFIX,
  SIGNAL_HALO_LAYER_PREFIX,
  signalHaloLayerId,
  signalLayerId,
  signalSourceId,
} from "./signal-layer-ids";
import type { SignalCategory } from "../../signals/types";

type SeverityField = "radius" | "opacity" | "color" | "strokeColor";

const matchExpression = (field: SeverityField, fallback: number | string) => [
  "match",
  ["get", "severity"],
  ...Object.entries(SEVERITY_STYLES).flatMap(([k, s]) => [k, s[field]]),
  fallback,
];

const strokeColorMatch = matchExpression("strokeColor", SEVERITY_STYLES.minor.strokeColor) as never;
const strokeWidthMatch = [
  "match",
  ["get", "severity"],
  ...Object.entries(SEVERITY_STYLES).flatMap(([k, s]) => [k, s.strokeWidth]),
  0,
];
const strokeOpacityMatch = [
  "match",
  ["get", "severity"],
  ...Object.entries(SEVERITY_STYLES).flatMap(([k, s]) => [k, s.strokeOpacity]),
  0,
];

const HALO_SEVERITIES: string[] = Object.entries(SEVERITY_STYLES)
  .filter(([, s]) => s.pulse)
  .map(([k]) => k);

export type SignalLayerManager = {
  readonly updateCategoryLayer: (
    category: SignalCategory,
    signals: readonly SignalFeedItem[],
  ) => void;
  readonly removeCategoryLayer: (category: SignalCategory) => void;
  readonly pruneExcept: (keep: readonly SignalCategory[]) => void;
  readonly clearAll: () => void;
};

export function useSignalLayerManager(
  map: Ref<Map | null>,
  isLoaded: Ref<boolean>,
): SignalLayerManager {
  function addHaloLayer(category: SignalCategory): void {
    const m = map.value;
    if (!m) return;
    const lid = signalHaloLayerId(category);
    const sid = signalSourceId(category);
    if (m.getLayer(lid)) return;
    m.addLayer(
      {
        id: lid,
        source: sid,
        type: "circle",
        filter: ["match", ["get", "severity"], HALO_SEVERITIES, true, false] as never,
        paint: {
          "circle-radius": 0,
          "circle-color": matchExpression("color", SEVERITY_STYLES.minor.color) as never,
          "circle-opacity": 0,
          "circle-stroke-width": 0,
        },
      },
      signalLayerId(category),
    );
  }

  function updateCategoryLayer(category: SignalCategory, signals: readonly SignalFeedItem[]): void {
    const m = map.value;
    if (!m || !isLoaded.value) return;

    const sid = signalSourceId(category);
    const lid = signalLayerId(category);
    const geojson = signalFeedToGeoJson(signals);

    if (m.getSource(sid)) {
      (m.getSource(sid) as GeoJSONSource).setData(geojson);
      if (!m.getLayer(signalHaloLayerId(category))) {
        addHaloLayer(category);
      }
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
        "circle-stroke-color": strokeColorMatch as never,
        "circle-stroke-width": strokeWidthMatch as never,
        "circle-stroke-opacity": strokeOpacityMatch as never,
      },
    });

    addHaloLayer(category);
  }

  function removeCategoryLayer(category: SignalCategory): void {
    const m = map.value;
    if (!m) return;

    const haloLid = signalHaloLayerId(category);
    const lid = signalLayerId(category);
    const sid = signalSourceId(category);

    if (m.getLayer(haloLid)) m.removeLayer(haloLid);
    if (m.getLayer(lid)) m.removeLayer(lid);
    if (m.getSource(sid)) m.removeSource(sid);
  }

  function pruneExcept(keep: readonly SignalCategory[]): void {
    const m = map.value;
    if (!m) return;
    const keepSet = new Set(keep);
    for (const category of SIGNAL_CATEGORIES) {
      if (!keepSet.has(category)) {
        removeCategoryLayer(category);
      }
    }
  }

  function clearAll(): void {
    const m = map.value;
    if (!m) return;

    const layers = m.getStyle().layers ?? [];
    for (const layer of layers) {
      if (
        layer.id.startsWith(`${SIGNAL_HALO_LAYER_PREFIX}-`) ||
        layer.id.startsWith(`${SIGNAL_LAYER_PREFIX}-circle-`)
      ) {
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

  return { updateCategoryLayer, removeCategoryLayer, pruneExcept, clearAll };
}
