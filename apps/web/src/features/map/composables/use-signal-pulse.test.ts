import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref, type Ref } from "vue";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useSignalPulse } from "./use-signal-pulse";
import type { SignalCategory } from "../../signals/types";

type MapMock = ReturnType<typeof makeMap>;
type MapRef = Ref<MapLibreMap | null>;

const makeMap = (layerIds: string[] = []) => {
  const layerSet = new Set(layerIds);
  return {
    getLayer: vi.fn((id: string) => (layerSet.has(id) ? { id } : undefined)),
    setPaintProperty: vi.fn(),
  };
};

const toMapRef = (mock: MapMock): MapRef => ref(mock) as unknown as MapRef;

describe("useSignalPulse", () => {
  let originalRAF: typeof globalThis.requestAnimationFrame;
  let originalCAF: typeof globalThis.cancelAnimationFrame;
  let rafCallbacks: FrameRequestCallback[];

  beforeEach(() => {
    originalRAF = globalThis.requestAnimationFrame;
    originalCAF = globalThis.cancelAnimationFrame;
    rafCallbacks = [];
    globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    }) as never;
    globalThis.cancelAnimationFrame = vi.fn() as never;
  });

  afterEach(() => {
    globalThis.requestAnimationFrame = originalRAF;
    globalThis.cancelAnimationFrame = originalCAF;
  });

  it("does not schedule a frame when the map is not loaded", async () => {
    const mapMock = makeMap(["oracle-signals-halo-earthquake"]);
    const map = toMapRef(mapMock);
    const isLoaded = ref(false);
    const categories = ref<readonly SignalCategory[]>(["earthquake"]);

    useSignalPulse(map, isLoaded, () => categories.value);
    await nextTick();

    expect(rafCallbacks.length).toBe(0);
  });

  it("does not schedule a frame when no halo layers exist on the map", async () => {
    const mapMock = makeMap([]);
    const map = toMapRef(mapMock);
    const isLoaded = ref(true);
    const categories = ref<readonly SignalCategory[]>(["earthquake"]);

    useSignalPulse(map, isLoaded, () => categories.value);
    await nextTick();

    expect(rafCallbacks.length).toBe(0);
  });

  it("schedules a frame when the map is loaded and halo layers exist", async () => {
    const mapMock = makeMap(["oracle-signals-halo-earthquake"]);
    const map = toMapRef(mapMock);
    const isLoaded = ref(true);
    const categories = ref<readonly SignalCategory[]>(["earthquake"]);

    useSignalPulse(map, isLoaded, () => categories.value);
    await nextTick();

    expect(rafCallbacks.length).toBe(1);
  });

  it("updates paint properties on the halo layer when the frame fires", async () => {
    const mapMock = makeMap(["oracle-signals-halo-earthquake"]);
    const map = toMapRef(mapMock);
    const isLoaded = ref(true);
    const categories = ref<readonly SignalCategory[]>(["earthquake"]);

    useSignalPulse(map, isLoaded, () => categories.value);
    await nextTick();

    expect(rafCallbacks.length).toBe(1);
    rafCallbacks[0]?.(performance.now());

    expect(mapMock.setPaintProperty).toHaveBeenCalledWith(
      "oracle-signals-halo-earthquake",
      "circle-radius",
      expect.anything(),
    );
    expect(mapMock.setPaintProperty).toHaveBeenCalledWith(
      "oracle-signals-halo-earthquake",
      "circle-opacity",
      expect.anything(),
    );
  });

  it("stops scheduling frames when the map becomes unloaded", async () => {
    const mapMock = makeMap(["oracle-signals-halo-earthquake"]);
    const map = toMapRef(mapMock);
    const isLoaded = ref(true);
    const categories = ref<readonly SignalCategory[]>(["earthquake"]);

    useSignalPulse(map, isLoaded, () => categories.value);
    await nextTick();

    expect(rafCallbacks.length).toBe(1);
    rafCallbacks[0]?.(performance.now());

    isLoaded.value = false;
    await nextTick();

    expect(globalThis.cancelAnimationFrame).toHaveBeenCalled();
  });

  it("re-evaluates paint properties when categories swap with equal count", async () => {
    const firstMapMock = makeMap(["oracle-signals-halo-earthquake"]);
    const map = toMapRef(firstMapMock);
    const isLoaded = ref(true);
    const categories = ref<readonly SignalCategory[]>(["earthquake"]);

    useSignalPulse(map, isLoaded, () => categories.value);
    await nextTick();

    rafCallbacks[0]?.(performance.now());
    const callsAfterFirstFrame = firstMapMock.setPaintProperty.mock.calls.length;

    const newMapMock = makeMap(["oracle-signals-halo-weather"]);
    map.value = newMapMock as unknown as MapLibreMap;
    categories.value = ["weather"];
    await nextTick();

    expect(rafCallbacks.length).toBe(2);
    rafCallbacks[1]?.(performance.now());
    expect(newMapMock.setPaintProperty).toHaveBeenCalledWith(
      "oracle-signals-halo-weather",
      "circle-radius",
      expect.anything(),
    );
    expect(callsAfterFirstFrame).toBeGreaterThan(0);
  });
});
