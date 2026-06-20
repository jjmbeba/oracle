import { onBeforeUnmount, watch, type Ref } from "vue";
import type { Map, MapMouseEvent, MapGeoJSONFeature } from "maplibre-gl";
import { signalLayerId } from "./signal-layer-ids";
import type { SignalCategory, SignalGeoJsonFeature } from "../../signals/types";

export type SignalLayerClicks = {
  readonly dispose: () => void;
};

export function useSignalLayerClicks(
  map: Ref<Map | null>,
  isLoaded: Ref<boolean>,
  categories: () => readonly SignalCategory[],
  onClick: (lng: number, lat: number) => void,
): SignalLayerClicks {
  const registered = new Set<SignalCategory>();

  const clickHandler = (e: MapMouseEvent & { features?: MapGeoJSONFeature[] }): void => {
    const feature = e.features?.[0] as SignalGeoJsonFeature | undefined;
    if (!feature) return;
    const [lng, lat] = feature.geometry.coordinates;
    onClick(lng, lat);
  };

  function register(category: SignalCategory): void {
    const m = map.value;
    if (!m || registered.has(category)) return;
    m.on("click", signalLayerId(category), clickHandler);
    registered.add(category);
  }

  function unregister(category: SignalCategory): void {
    const m = map.value;
    if (!m || !registered.has(category)) return;
    m.off("click", signalLayerId(category), clickHandler);
    registered.delete(category);
  }

  watch(
    [isLoaded, () => categories()],
    ([loaded, list]) => {
      if (!loaded) return;
      const next = new Set(list);

      for (const cat of registered) {
        if (!next.has(cat)) unregister(cat);
      }
      for (const cat of next) {
        if (!registered.has(cat)) register(cat);
      }
    },
    { immediate: true },
  );

  function dispose(): void {
    for (const cat of registered) {
      unregister(cat);
    }
  }

  onBeforeUnmount(dispose);

  return { dispose };
}
