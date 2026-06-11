import maplibregl from "maplibre-gl";
import type { Map } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { shallowRef } from "vue";

const DEFAULT_MAP_STYLE_URL = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export function useMapLibre() {
  const map = shallowRef<Map | null>(null);
  const isLoaded = shallowRef(false);

  function init(options: {
    container: string | HTMLElement;
    style?: string;
    center?: [number, number];
    zoom?: number;
  }) {
    const instance = new maplibregl.Map({
      container: options.container,
      style: options.style ?? DEFAULT_MAP_STYLE_URL,
      center: options.center ?? [0, 20],
      zoom: options.zoom ?? 1.5,
      attributionControl: {},
    });

    instance.on("load", () => {
      isLoaded.value = true;
    });

    map.value = instance;
  }

  function destroy() {
    if (map.value) {
      map.value.remove();
      map.value = null;
      isLoaded.value = false;
    }
  }

  return { map, isLoaded, init, destroy };
}
