import { onBeforeUnmount, watch, type Ref } from "vue";
import type { Map, MapMouseEvent, MapGeoJSONFeature } from "maplibre-gl";
import { signalLayerId } from "./signal-layer-ids";
import type { SignalCategory, SignalGeoJsonFeature } from "../../signals/types";

export type SignalTooltipInteraction = {
  readonly dispose: () => void;
};

export type SignalTooltipHandlers = {
  readonly onShow: (feature: SignalGeoJsonFeature) => void;
  readonly onHide: () => void;
};

export function useSignalLayerTooltips(
  map: Ref<Map | null>,
  isLoaded: Ref<boolean>,
  categories: () => readonly SignalCategory[],
  handlers: SignalTooltipHandlers,
): SignalTooltipInteraction {
  const registered = new Set<SignalCategory>();
  let boundMap: Map | null = null;

  const enterHandler = (e: MapMouseEvent & { features?: MapGeoJSONFeature[] }): void => {
    const feature = e.features?.[0] as SignalGeoJsonFeature | undefined;
    if (!feature) return;
    const m = map.value;
    if (m) m.getCanvas().style.cursor = "pointer";
    handlers.onShow(feature);
  };

  const leaveHandler = (): void => {
    const m = map.value;
    if (m) m.getCanvas().style.cursor = "";
    handlers.onHide();
  };

  function register(category: SignalCategory): void {
    const m = map.value;
    if (!m || registered.has(category)) return;
    const lid = signalLayerId(category);
    m.on("mouseenter", lid, enterHandler);
    m.on("mouseleave", lid, leaveHandler);
    registered.add(category);
  }

  function unregister(category: SignalCategory, targetMap: Map | null = map.value): void {
    const m = targetMap;
    if (!m || !registered.has(category)) return;
    const lid = signalLayerId(category);
    m.off("mouseenter", lid, enterHandler);
    m.off("mouseleave", lid, leaveHandler);
    registered.delete(category);
  }

  function unregisterAll(): void {
    const m = boundMap;
    if (!m) return;
    for (const cat of registered) {
      unregister(cat, m);
    }
    m.getCanvas().style.cursor = "";
    registered.clear();
  }

  watch(
    [map, isLoaded, () => categories()],
    ([currentMap, loaded, list]) => {
      if (boundMap && boundMap !== currentMap) {
        unregisterAll();
      }
      boundMap = currentMap;
      if (!loaded || !currentMap) return;
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
    unregisterAll();
    boundMap = null;
  }

  onBeforeUnmount(dispose);

  return { dispose };
}
