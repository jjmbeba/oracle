import { describe, expect, it, vi } from "vitest";
import { defaultUsgsUrl, fetchUsgsSignals } from "./fetch";

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

  it("uses the default USGS URL when none is provided", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);

    await fetchUsgsSignals(mockFetch);

    expect(mockFetch).toHaveBeenCalledWith(
      defaultUsgsUrl,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("uses the provided URL", async () => {
    const customUrl = "https://example.com/usgs";
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);

    await fetchUsgsSignals(mockFetch, customUrl);

    expect(mockFetch).toHaveBeenCalledWith(
      customUrl,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("labels non-ok responses with the USGS API prefix", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
    } as Response);

    await expect(fetchUsgsSignals(mockFetch)).rejects.toThrow(
      "USGS API returned 503 Service Unavailable for",
    );
  });
});
