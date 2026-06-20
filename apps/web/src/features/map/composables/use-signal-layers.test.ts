import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { useSignalLayerManager } from "./use-signal-layers";
import type { SignalFeedItem } from "../../signals/api";

const pointSignal: SignalFeedItem = {
  provider: "usgs",
  category: "earthquake",
  title: "M 5.2",
  severity: "severe",
  confidence: "high",
  effectiveAt: "2026-06-18T12:00:00.000Z",
  scope: { kind: "point", coordinates: [-155.1, 19.6] },
};

type AddLayerCall = { id: string; beforeId?: string };

const makeMap = () => {
  const layers = new Map<string, { id: string; source: string }>();
  const sources = new Map<string, unknown>();
  const addLayerCalls: AddLayerCall[] = [];

  return {
    getSource: vi.fn((id: string) => sources.get(id)),
    getLayer: vi.fn((id: string) => layers.get(id)),
    addSource: vi.fn((id: string) => {
      sources.set(id, {});
    }),
    addLayer: vi.fn((def: { id: string; source: string }, beforeId?: string) => {
      layers.set(def.id, def);
      addLayerCalls.push({ id: def.id, beforeId });
    }),
    removeLayer: vi.fn((id: string) => {
      layers.delete(id);
    }),
    removeSource: vi.fn((id: string) => {
      sources.delete(id);
    }),
    getStyle: vi.fn(() => ({
      layers: [...layers.keys()].map((id) => ({ id })),
      sources: Object.fromEntries(sources),
    })),
    addLayerCalls,
  };
};

describe("useSignalLayerManager", () => {
  it("adds the main dot layer before the halo layer with the main layer as beforeId", () => {
    const mapMock = makeMap();
    const map = ref(mapMock as never);
    const isLoaded = ref(true);
    const manager = useSignalLayerManager(map, isLoaded);

    manager.updateCategoryLayer("earthquake", [pointSignal]);

    const mainIdx = mapMock.addLayerCalls.findIndex(
      (c) => c.id === "oracle-signals-circle-earthquake",
    );
    const haloIdx = mapMock.addLayerCalls.findIndex(
      (c) => c.id === "oracle-signals-halo-earthquake",
    );

    expect(mainIdx).toBeGreaterThanOrEqual(0);
    expect(haloIdx).toBeGreaterThan(mainIdx);
    expect(mapMock.addLayerCalls[haloIdx]?.beforeId).toBe("oracle-signals-circle-earthquake");
  });

  it("does not add layers when there are no point signals", () => {
    const mapMock = makeMap();
    const map = ref(mapMock as never);
    const isLoaded = ref(true);
    const manager = useSignalLayerManager(map, isLoaded);

    manager.updateCategoryLayer("earthquake", []);

    expect(mapMock.addLayer).not.toHaveBeenCalled();
    expect(mapMock.addSource).not.toHaveBeenCalled();
  });

  it("clears both halo and main dot layers on clearAll", () => {
    const mapMock = makeMap();
    const map = ref(mapMock as never);
    const isLoaded = ref(true);
    const manager = useSignalLayerManager(map, isLoaded);

    manager.updateCategoryLayer("earthquake", [pointSignal]);
    manager.clearAll();

    expect(mapMock.removeLayer).toHaveBeenCalledWith("oracle-signals-halo-earthquake");
    expect(mapMock.removeLayer).toHaveBeenCalledWith("oracle-signals-circle-earthquake");
  });

  it("removes both halo and main dot layers on removeCategoryLayer", () => {
    const mapMock = makeMap();
    const map = ref(mapMock as never);
    const isLoaded = ref(true);
    const manager = useSignalLayerManager(map, isLoaded);

    manager.updateCategoryLayer("earthquake", [pointSignal]);
    manager.removeCategoryLayer("earthquake");

    expect(mapMock.removeLayer).toHaveBeenCalledWith("oracle-signals-halo-earthquake");
    expect(mapMock.removeLayer).toHaveBeenCalledWith("oracle-signals-circle-earthquake");
    expect(mapMock.removeSource).toHaveBeenCalledWith("oracle-signals-earthquake");
  });
});
