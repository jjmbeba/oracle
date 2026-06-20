import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";
import { useSignalPulse } from "./use-signal-pulse";
import type { SignalCategory } from "../../signals/types";

const makeMap = (layerIds: string[] = []) => {
  const layerSet = new Set(layerIds);
  return {
    getLayer: vi.fn((id: string) => (layerSet.has(id) ? { id } : undefined)),
    setPaintProperty: vi.fn(),
  };
};

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
    const map = ref(mapMock as never);
    const isLoaded = ref(false);
    const categories = ref<readonly SignalCategory[]>(["earthquake"]);

    useSignalPulse(map, isLoaded, () => categories.value);
    await nextTick();

    expect(rafCallbacks.length).toBe(0);
  });

  it("does not schedule a frame when no halo layers exist on the map", async () => {
    const mapMock = makeMap([]);
    const map = ref(mapMock as never);
    const isLoaded = ref(true);
    const categories = ref<readonly SignalCategory[]>(["earthquake"]);

    useSignalPulse(map, isLoaded, () => categories.value);
    await nextTick();

    expect(rafCallbacks.length).toBe(0);
  });

  it("schedules a frame when the map is loaded and halo layers exist", async () => {
    const mapMock = makeMap(["oracle-signals-halo-earthquake"]);
    const map = ref(mapMock as never);
    const isLoaded = ref(true);
    const categories = ref<readonly SignalCategory[]>(["earthquake"]);

    useSignalPulse(map, isLoaded, () => categories.value);
    await nextTick();

    expect(rafCallbacks.length).toBe(1);
  });

  it("updates paint properties on the halo layer when the frame fires", async () => {
    const mapMock = makeMap(["oracle-signals-halo-earthquake"]);
    const map = ref(mapMock as never);
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
    const map = ref(mapMock as never);
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
});
