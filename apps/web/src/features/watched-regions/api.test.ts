import { describe, expect, it } from "vitest";
import {
  WATCHED_REGIONS_PATH,
  fetchWatchedRegions,
  watchRegion,
  unwatchRegion,
  fetchChangeReport,
} from "./api";

const regionSearchResult = {
  id: "country:ke",
  kind: "country" as const,
  displayName: "Kenya",
  alpha2: "KE",
};

const watchedRegion = {
  id: "wr-1",
  regionId: "country:ke",
  region: regionSearchResult,
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("fetchWatchedRegions", () => {
  it("calls the configured watched-regions path", async () => {
    const calls: Array<RequestInfo | URL> = [];
    const fetcher = async (input: RequestInfo | URL) => {
      calls.push(input);
      return Response.json({ watchedRegions: [] });
    };

    await fetchWatchedRegions(fetcher);

    expect(calls).toEqual([WATCHED_REGIONS_PATH]);
  });

  it("parses a successful response", async () => {
    const result = await fetchWatchedRegions(async () => {
      return Response.json({ watchedRegions: [watchedRegion] });
    });

    expect(result).toEqual([watchedRegion]);
  });

  it("parses an empty response", async () => {
    const result = await fetchWatchedRegions(async () => {
      return Response.json({ watchedRegions: [] });
    });

    expect(result).toEqual([]);
  });

  it("rejects a failed response", async () => {
    await expect(
      fetchWatchedRegions(async () => new Response(null, { status: 401 })),
    ).rejects.toThrow("Failed to fetch watched regions: 401");
  });

  it("rejects a malformed response", async () => {
    await expect(fetchWatchedRegions(async () => Response.json({}))).rejects.toThrow(
      "Watched regions returned an invalid response",
    );
  });
});

describe("watchRegion", () => {
  it("sends a POST with the regionId", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

    const result = await watchRegion("country:ke", async (input, init) => {
      calls.push({ input, init });
      return Response.json({ watchedRegion }, { status: 201 });
    });

    expect(result).toEqual(watchedRegion);
    expect(calls).toHaveLength(1);
    expect(calls[0].input).toBe(WATCHED_REGIONS_PATH);
    expect(calls[0].init?.method).toBe("POST");
    expect(calls[0].init?.body).toBe(JSON.stringify({ regionId: "country:ke" }));
  });

  it("rejects a failed response with server error message", async () => {
    await expect(
      watchRegion("country:ke", async () => {
        return Response.json(
          { error: { code: "watch_limit_reached", message: "Cannot watch more than 10 regions" } },
          { status: 400 },
        );
      }),
    ).rejects.toThrow("Cannot watch more than 10 regions");
  });

  it("rejects a malformed response", async () => {
    await expect(
      watchRegion("country:ke", async () => {
        return Response.json({ watchedRegion: { id: "wr-1" } }, { status: 201 });
      }),
    ).rejects.toThrow("Watch region returned an invalid response");
  });
});

describe("unwatchRegion", () => {
  it("sends a DELETE to the region-specific path", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

    await unwatchRegion("country:ke", async (input, init) => {
      calls.push({ input, init });
      return Response.json({ success: true });
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].input).toBe(`${WATCHED_REGIONS_PATH}/country%3Ake`);
    expect(calls[0].init?.method).toBe("DELETE");
  });

  it("encodes region IDs in the URL", async () => {
    const calls: Array<RequestInfo | URL> = [];

    await unwatchRegion("group:eastern-africa", async (input) => {
      calls.push(input);
      return Response.json({ success: true });
    });

    expect(calls[0].toString()).toContain(encodeURIComponent("group:eastern-africa"));
  });

  it("rejects a failed response", async () => {
    await expect(
      unwatchRegion("country:ke", async () => {
        return Response.json(
          { error: { code: "watched_region_not_found", message: "Watched region not found" } },
          { status: 404 },
        );
      }),
    ).rejects.toThrow("Watched region not found");
  });
});

const sampleReport = {
  generatedAt: "2026-01-01T12:00:00.000Z",
  newSignals: [
    { dedupeKey: "usgs:abc", severity: "severe", category: "earthquake", occurredAt: "2026-01-01T11:00:00.000Z" },
  ],
  expiredSignals: [
    { dedupeKey: "usgs:def", severity: "minor", category: "weather", occurredAt: null },
  ],
  severityChanges: [
    { dedupeKey: "usgs:ghi", severity: "extreme", category: "earthquake", occurredAt: "2026-01-01T10:00:00.000Z", fromSeverity: "severe" },
  ],
  riskMovement: { fromScore: 15, toScore: 42, fromLevel: "watch", toLevel: "elevated" },
};

describe("fetchChangeReport", () => {
  it("calls the change-report path with an encoded region ID", async () => {
    const calls: Array<RequestInfo | URL> = [];
    const fetcher = async (input: RequestInfo | URL) => {
      calls.push(input);
      return Response.json({ changeReport: null });
    };

    await fetchChangeReport("group:eastern-africa", fetcher);

    expect(calls).toHaveLength(1);
    expect(calls[0].toString()).toContain(
      `${WATCHED_REGIONS_PATH}/group%3Aeastern-africa/change-report`,
    );
  });

  it("parses a populated report", async () => {
    const result = await fetchChangeReport("country:ke", async () => {
      return Response.json({ changeReport: sampleReport });
    });

    expect(result).toEqual(sampleReport);
  });

  it("parses changeReport: null", async () => {
    const result = await fetchChangeReport("country:ke", async () => {
      return Response.json({ changeReport: null });
    });

    expect(result).toBeNull();
  });

  it("throws on 404 with server error message", async () => {
    await expect(
      fetchChangeReport("country:ke", async () => {
        return Response.json(
          { error: { code: "watched_region_not_found", message: "Watched region not found" } },
          { status: 404 },
        );
      }),
    ).rejects.toThrow("Watched region not found");
  });

  it("rejects a malformed response", async () => {
    await expect(
      fetchChangeReport("country:ke", async () => {
        return Response.json({ changeReport: { generatedAt: 123 } });
      }),
    ).rejects.toThrow("Change report returned an invalid response");
  });
});
