import { describe, expect, it } from "vitest";
import { REGION_SEARCH_PATH, fetchRegionSearch } from "./api";

describe("region search client", () => {
  it("calls the configured region search path for blank queries", async () => {
    const calls: Array<RequestInfo | URL> = [];
    const fetcher = async (input: RequestInfo | URL) => {
      calls.push(input);

      return Response.json({ regions: [] });
    };

    await fetchRegionSearch("", fetcher);

    expect(calls).toEqual([REGION_SEARCH_PATH]);
  });

  it("calls the configured region search path for whitespace queries", async () => {
    const calls: Array<RequestInfo | URL> = [];
    const fetcher = async (input: RequestInfo | URL) => {
      calls.push(input);

      return Response.json({ regions: [] });
    };

    await fetchRegionSearch("   ", fetcher);

    expect(calls).toEqual([REGION_SEARCH_PATH]);
  });

  it("passes nonblank queries through the configured query parameter", async () => {
    const calls: Array<RequestInfo | URL> = [];
    const fetcher = async (input: RequestInfo | URL) => {
      calls.push(input);

      return Response.json({ regions: [] });
    };

    await fetchRegionSearch("kenya", fetcher);

    expect(calls).toEqual([`${REGION_SEARCH_PATH}?q=kenya`]);
  });

  it("encodes search query characters", async () => {
    const calls: Array<RequestInfo | URL> = [];
    const fetcher = async (input: RequestInfo | URL) => {
      calls.push(input);

      return Response.json({ regions: [] });
    };

    await fetchRegionSearch("cote d'ivoire", fetcher);

    expect(calls).toEqual([`${REGION_SEARCH_PATH}?q=cote%20d'ivoire`]);
  });

  it("parses country results", async () => {
    const regions = await fetchRegionSearch("kenya", async () => {
      return Response.json({
        regions: [
          {
            id: "country:ke",
            kind: "country",
            displayName: "Kenya",
            alpha2: "KE",
          },
        ],
      });
    });

    expect(regions).toEqual([
      {
        id: "country:ke",
        kind: "country",
        displayName: "Kenya",
        alpha2: "KE",
      },
    ]);
  });

  it("parses country-group and continent results", async () => {
    const regions = await fetchRegionSearch("africa", async () => {
      return Response.json({
        regions: [
          {
            id: "group:eastern-africa",
            kind: "country-group",
            displayName: "Eastern Africa",
            memberCountryIds: ["country:ke", "country:tz"],
            memberCount: 2,
          },
          {
            id: "continent:africa",
            kind: "continent",
            displayName: "Africa",
            memberCountryIds: ["country:ke", "country:tz", "country:za"],
            memberCount: 3,
          },
        ],
      });
    });

    expect(regions).toEqual([
      {
        id: "group:eastern-africa",
        kind: "country-group",
        displayName: "Eastern Africa",
        memberCountryIds: ["country:ke", "country:tz"],
        memberCount: 2,
      },
      {
        id: "continent:africa",
        kind: "continent",
        displayName: "Africa",
        memberCountryIds: ["country:ke", "country:tz", "country:za"],
        memberCount: 3,
      },
    ]);
  });

  it("rejects a failed search response", async () => {
    await expect(
      fetchRegionSearch("kenya", async () => {
        return new Response(null, { status: 503 });
      }),
    ).rejects.toThrow("Region search failed with status 503");
  });

  it("rejects a malformed search response", async () => {
    await expect(
      fetchRegionSearch("kenya", async () => {
        return Response.json({
          regions: [
            {
              id: "country:ke",
              kind: "country",
              displayName: "Kenya",
            },
          ],
        });
      }),
    ).rejects.toThrow("Region search returned an invalid response");
  });
});
