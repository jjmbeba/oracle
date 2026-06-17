import { describe, expect, it, vi } from "vitest";
import { fetchUsgsSignals } from "./fetch";

describe("fetchUsgsSignals", () => {
  it("returns parsed data on success", async () => {
    const expectedData = { type: "FeatureCollection", features: [] };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(expectedData),
    } as Response);

    const result = await fetchUsgsSignals(mockFetch);

    expect(result.data).toEqual(expectedData);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("throws on non-ok response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
    } as Response);

    await expect(fetchUsgsSignals(mockFetch)).rejects.toThrow(
      "USGS API returned 503: Service Unavailable",
    );
  });

  it("throws on network error", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));

    await expect(fetchUsgsSignals(mockFetch)).rejects.toThrow("Network error");
  });

  it("uses the provided URL", async () => {
    const customUrl = "https://example.com/usgs";
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);

    await fetchUsgsSignals(mockFetch, customUrl);

    expect(mockFetch).toHaveBeenCalledWith(customUrl);
  });
});
