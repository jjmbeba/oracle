import { describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";
import { useSignalLayerClicks } from "./use-signal-layer-clicks";
import type { SignalCategory } from "../../signals/types";

type Listener = (...args: unknown[]) => void;

const makeMap = () => {
  const layers = new Map<string, Set<Listener>>();
  
  return {
    on: vi.fn((event: string, layerId: string, handler: Listener) => {
      if (event !== "click") return;
      const existing = layers.get(layerId) ?? new Set<Listener>();
      existing.add(handler);
      layers.set(layerId, existing);
    }),
    off: vi.fn((event: string, layerId: string, handler: Listener) => {
      if (event !== "click") return;
      layers.get(layerId)?.delete(handler);
    }),
    handlers: (layerId: string): ReadonlySet<Listener> =>
      layers.get(layerId) ?? new Set<Listener>(),
  };
};

describe("useSignalLayerClicks", () => {
  it("registers a click handler for each active category", () => {
    const mapMock = makeMap();
    const map = ref(mapMock as never);
    const isLoaded = ref(true);
    const categories = ref<readonly SignalCategory[]>(["earthquake", "weather"]);

    useSignalLayerClicks(map, isLoaded, () => categories.value, () => {});

    expect(mapMock.on).toHaveBeenCalled();
    expect(mapMock.handlers("oracle-signals-circle-earthquake").size).toBe(1);
    expect(mapMock.handlers("oracle-signals-circle-weather").size).toBe(1);
  });

  it("unregisters removed categories and registers new ones on diff", async () => {
    const mapMock = makeMap();
    const map = ref(mapMock as never);
    const isLoaded = ref(true);
    const categories = ref<readonly SignalCategory[]>(["earthquake"]);

    useSignalLayerClicks(map, isLoaded, () => categories.value, () => {});

    expect(mapMock.handlers("oracle-signals-circle-earthquake").size).toBe(1);
    expect(mapMock.handlers("oracle-signals-circle-weather").size).toBe(0);

    categories.value = ["weather"];
    await nextTick();
    expect(mapMock.handlers("oracle-signals-circle-earthquake").size).toBe(0);
    expect(mapMock.handlers("oracle-signals-circle-weather").size).toBe(1);
  });

  it("does not register anything before the map is loaded", () => {
    const mapMock = makeMap();
    const map = ref(mapMock as never);
    const isLoaded = ref(false);
    const categories = ref<readonly SignalCategory[]>(["earthquake"]);

    useSignalLayerClicks(map, isLoaded, () => categories.value, () => {});

    expect(mapMock.on).not.toHaveBeenCalled();
  });

  it("forwards the feature's coordinates to the onClick callback", () => {
    const mapMock = makeMap();
    const map = ref(mapMock as never);
    const isLoaded = ref(true);
    const categories = ref<readonly SignalCategory[]>(["earthquake"]);
    const onClick = vi.fn();

    useSignalLayerClicks(map, isLoaded, () => categories.value, onClick);

    const handler = [...mapMock.handlers("oracle-signals-circle-earthquake")][0] as (e: unknown) => void;
    handler({
      features: [
        {
          type: "Feature",
          id: "x",
          geometry: { type: "Point", coordinates: [12.34, 56.78] },
          properties: {
            provider: "usgs",
            category: "earthquake",
            title: "x",
            severity: "minor",
            confidence: "low",
            effectiveAt: "2026-01-01T00:00:00.000Z",
          },
        },
      ],
    });

    expect(onClick).toHaveBeenCalledWith(12.34, 56.78);
  });
});
