import { describe, expect, it, vi } from "vitest";
import { fetchJson } from "./fetch-json";

function decodedParams(url: string): Record<string, string> {
  const params = new URL(url).searchParams;
  const result: Record<string, string> = {};
  for (const [key, value] of params) {
    result[key] = value;
  }
  return result;
}

describe("fetchJson", () => {
  it("redacts sensitive query params from error URLs on non-ok response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    } as Response);

    let captured: (Error & { url?: string; status?: number }) | undefined;
    try {
      await fetchJson("https://api.example.com/data?appid=secret-key&other=keep", {
        fetchFn: mockFetch,
        errorLabel: "Test API",
      });
    } catch (error) {
      captured = error as Error & { url?: string; status?: number };
    }

    expect(captured).toBeDefined();
    expect(captured!.status).toBe(401);
    expect(captured!.url).toBeDefined();
    expect(decodedParams(captured!.url!)).toEqual({
      appid: "[REDACTED]",
      other: "keep",
    });
  });

  it("redacts sensitive params on fetch error (e.g. TypeError)", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new TypeError("fetch failed"));

    let captured: (Error & { url?: string }) | undefined;
    try {
      await fetchJson("https://api.example.com/data?apiKey=abc123", {
        fetchFn: mockFetch,
        errorLabel: "Test API",
      });
    } catch (error) {
      captured = error as Error & { url?: string };
    }

    expect(captured).toBeDefined();
    expect(captured!.url).toBeDefined();
    expect(decodedParams(captured!.url!)).toEqual({ apiKey: "[REDACTED]" });
  });

  it("preserves URLs without sensitive params", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    } as Response);

    let captured: (Error & { url?: string }) | undefined;
    try {
      await fetchJson("https://api.example.com/data?user=alice&page=1", {
        fetchFn: mockFetch,
        errorLabel: "Test API",
      });
    } catch (error) {
      captured = error as Error & { url?: string };
    }

    expect(captured).toBeDefined();
    expect(captured!.url).toBe("https://api.example.com/data?user=alice&page=1");
  });

  it("passes malformed URLs through unchanged", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("network error"));

    let captured: (Error & { url?: string }) | undefined;
    try {
      await fetchJson("not-a-valid-url", {
        fetchFn: mockFetch,
        errorLabel: "Test API",
      });
    } catch (error) {
      captured = error as Error & { url?: string };
    }

    expect(captured).toBeDefined();
    expect(captured!.url).toBe("not-a-valid-url");
  });

  it("returns data and response on success", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: "ok" }),
    } as Response);

    const result = await fetchJson("https://api.example.com/data", {
      fetchFn: mockFetch,
    });

    expect(result).toEqual({
      data: { result: "ok" },
      response: expect.objectContaining({ ok: true }),
    });
  });
});
