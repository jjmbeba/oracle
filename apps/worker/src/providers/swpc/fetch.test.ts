import { describe, expect, it, vi } from "vitest";
import { defaultSwpcUrl, fetchSwpcAlerts } from "./fetch";

describe("fetchSwpcAlerts", () => {
  it("returns parsed data on success", async () => {
    const expectedData = [{ product_id: "K04A" }];
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(expectedData),
    } as Response);

    const result = await fetchSwpcAlerts(mockFetch);

    expect(result.data).toEqual(expectedData);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("uses the default SWPC URL when none is provided", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    } as Response);

    await fetchSwpcAlerts(mockFetch);

    expect(mockFetch).toHaveBeenCalledWith(
      defaultSwpcUrl,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("uses the provided URL", async () => {
    const customUrl = "https://example.com/swpc";
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    } as Response);

    await fetchSwpcAlerts(mockFetch, customUrl);

    expect(mockFetch).toHaveBeenCalledWith(
      customUrl,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("labels non-ok responses with the SWPC API prefix", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    } as Response);

    await expect(fetchSwpcAlerts(mockFetch)).rejects.toThrow(
      "SWPC API returned 500: Internal Server Error",
    );
  });
});
