import { describe, expect, it } from "vitest";
import { SIGNAL_FEED_PATH, fetchSignalFeed } from "./api";

const sampleSignal = {
  provider: "usgs",
  category: "earthquake",
  title: "M 5.2 - 12 km SW of Hilo, Hawaii",
  severity: "moderate",
  confidence: "high",
  effectiveAt: "2026-06-18T12:00:00.000Z",
  scope: { kind: "point", coordinates: [-155.1, 19.6] },
  sourceLink: { url: "https://example.com", label: "USGS" },
};

const sampleFreshness = {
  provider: "usgs",
  category: "earthquake",
  lastSuccessfulPollAt: "2026-06-18T12:05:00.000Z",
};

describe("fetchSignalFeed", () => {
  it("calls the configured signal feed path with the category query", async () => {
    const calls: Array<RequestInfo | URL> = [];
    const fetcher = async (input: RequestInfo | URL) => {
      calls.push(input);
      return Response.json({ signals: [], freshness: [] });
    };

    await fetchSignalFeed("earthquake", fetcher);

    expect(calls).toEqual([`${SIGNAL_FEED_PATH}?category=earthquake`]);
  });

  it("encodes the category parameter", async () => {
    const calls: Array<RequestInfo | URL> = [];

    await fetchSignalFeed("space-weather", async (input) => {
      calls.push(input);
      return Response.json({ signals: [], freshness: [] });
    });

    expect(calls[0].toString()).toContain(encodeURIComponent("space-weather"));
  });

  it("parses a successful response", async () => {
    const result = await fetchSignalFeed("earthquake", async () => {
      return Response.json({
        signals: [sampleSignal],
        freshness: [sampleFreshness],
      });
    });

    expect(result.signals).toHaveLength(1);
    expect(result.signals[0].title).toBe("M 5.2 - 12 km SW of Hilo, Hawaii");
    expect(result.freshness).toHaveLength(1);
    expect(result.freshness[0].provider).toBe("usgs");
  });

  it("parses an empty response", async () => {
    const result = await fetchSignalFeed("earthquake", async () => {
      return Response.json({ signals: [], freshness: [] });
    });

    expect(result.signals).toEqual([]);
    expect(result.freshness).toEqual([]);
  });

  it("rejects a failed response", async () => {
    await expect(
      fetchSignalFeed("earthquake", async () => {
        return new Response(null, { status: 400 });
      }),
    ).rejects.toThrow("Signal feed request failed with status 400");
  });

  it("rejects a malformed response", async () => {
    await expect(
      fetchSignalFeed("earthquake", async () => {
        return Response.json({ signals: [{}], freshness: [] });
      }),
    ).rejects.toThrow("Signal feed returned an invalid response");
  });

  it("rejects a response with missing signals array", async () => {
    await expect(
      fetchSignalFeed("earthquake", async () => {
        return Response.json({ freshness: [] });
      }),
    ).rejects.toThrow("Signal feed returned an invalid response");
  });

  it("accepts global scope signals", async () => {
    const result = await fetchSignalFeed("space-weather", async () => {
      return Response.json({
        signals: [
          {
            ...sampleSignal,
            category: "space-weather",
            scope: { kind: "global" },
          },
        ],
        freshness: [],
      });
    });

    expect(result.signals[0].scope).toEqual({ kind: "global" });
  });

  it("accepts signals without source links", async () => {
    const result = await fetchSignalFeed("earthquake", async () => {
      return Response.json({
        signals: [
          {
            provider: "usgs",
            category: "earthquake",
            title: "No source",
            severity: "minor",
            confidence: "low",
            effectiveAt: "2026-06-18T12:00:00.000Z",
            scope: { kind: "global" },
          },
        ],
        freshness: [],
      });
    });

    expect(result.signals[0].title).toBe("No source");
  });

  it("rejects geometry scope without geometry payload", async () => {
    await expect(
      fetchSignalFeed("earthquake", async () => {
        return Response.json({
          signals: [
            {
              ...sampleSignal,
              scope: { kind: "geometry" },
            },
          ],
          freshness: [],
        });
      }),
    ).rejects.toThrow("Signal feed returned an invalid response");
  });

  it("rejects sourceLink with non-string label", async () => {
    await expect(
      fetchSignalFeed("earthquake", async () => {
        return Response.json({
          signals: [
            {
              ...sampleSignal,
              sourceLink: { url: "https://example.com", label: 42 },
            },
          ],
          freshness: [],
        });
      }),
    ).rejects.toThrow("Signal feed returned an invalid response");
  });
});
