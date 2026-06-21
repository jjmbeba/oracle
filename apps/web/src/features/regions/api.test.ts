import { describe, expect, it } from "vitest";
import type { CountryDossierFacts } from "./api";
import {
  REGION_SEARCH_PATH,
  fetchRegionActiveSignals,
  fetchRegionDossier,
  fetchRegionSearch,
} from "./api";

describe("region search client", () => {
  function mockFetcher(calls: Array<RequestInfo | URL>) {
    return async (input: RequestInfo | URL) => {
      calls.push(input);

      return Response.json({ regions: [] });
    };
  }

  it("calls the configured region search path for blank queries", async () => {
    const calls: Array<RequestInfo | URL> = [];

    await fetchRegionSearch("", mockFetcher(calls));

    expect(calls).toEqual([REGION_SEARCH_PATH]);
  });

  it("calls the configured region search path for whitespace queries", async () => {
    const calls: Array<RequestInfo | URL> = [];

    await fetchRegionSearch("   ", mockFetcher(calls));

    expect(calls).toEqual([REGION_SEARCH_PATH]);
  });

  it("passes nonblank queries through the configured query parameter", async () => {
    const calls: Array<RequestInfo | URL> = [];

    await fetchRegionSearch("kenya", mockFetcher(calls));

    expect(calls).toEqual([`${REGION_SEARCH_PATH}?q=kenya`]);
  });

  it("encodes search query characters", async () => {
    const calls: Array<RequestInfo | URL> = [];

    await fetchRegionSearch("cote d'ivoire", mockFetcher(calls));

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

describe("region dossier client", () => {
  const mockCountryDossier = {
    dossier: {
      region: {
        kind: "country",
        id: "country:ke",
        displayName: "Kenya",
        alpha2: "KE",
      },
      overviewFacts: {
        capital: "Nairobi",
        population: 54_000_000,
        languages: ["Swahili", "English"],
        currencies: ["KES"],
        latitude: -1.29,
        longitude: 36.82,
        flagEmoji: "🇰🇪",
        gdpPerCapita: 2200,
        populationDensity: 94,
      },
      factSources: [{ label: "UN Statistics 2024" }],
    },
  };

  it("parses a country dossier response", async () => {
    const dossier = await fetchRegionDossier("country:ke", async () => {
      return Response.json(mockCountryDossier);
    });

    expect(dossier.region.kind).toBe("country");
    if (dossier.region.kind !== "country") return;
    expect(dossier.region.alpha2).toBe("KE");
    const facts = dossier.overviewFacts as CountryDossierFacts | null;
    expect(facts?.capital).toBe("Nairobi");
    expect(facts?.languages).toContain("Swahili");
  });

  it("rejects a failed dossier response", async () => {
    await expect(
      fetchRegionDossier("country:xx", async () => {
        return new Response(null, { status: 404 });
      }),
    ).rejects.toThrow("Region dossier request failed with status 404");
  });

  it("rejects a malformed dossier response", async () => {
    await expect(
      fetchRegionDossier("country:ke", async () => {
        return Response.json({ dossier: { region: { kind: "country" } } });
      }),
    ).rejects.toThrow("Region dossier returned an invalid response");
  });
});

describe("region active signals client", () => {
  const sampleActiveSignalsResponse = {
    region: {
      id: "country:ke",
      kind: "country",
      displayName: "Kenya",
      alpha2: "KE",
    },
    signals: [
      {
        provider: "usgs",
        category: "earthquake",
        title: "M 5.2 - Kenya region",
        severity: "moderate",
        confidence: "high",
        effectiveAt: "2026-06-18T12:00:00.000Z",
        scope: { kind: "region", regionId: "country:ke" },
        sourceLink: { url: "https://example.com", label: "USGS" },
      },
      {
        provider: "noaa-swpc",
        category: "space-weather",
        title: "Geomagnetic K-index of 4",
        severity: "minor",
        confidence: "high",
        effectiveAt: "2026-06-13T21:01:31.000Z",
        scope: { kind: "global" },
      },
    ],
    freshness: [
      {
        provider: "usgs",
        category: "earthquake",
        lastSuccessfulPollAt: "2026-06-18T12:05:00.000Z",
      },
    ],
  };

  it("calls the active-signals endpoint for a region id", async () => {
    const calls: Array<RequestInfo | URL> = [];

    await fetchRegionActiveSignals("country:ke", async (input) => {
      calls.push(input);
      return Response.json(sampleActiveSignalsResponse);
    });

    expect(calls).toEqual(["/api/regions/country%3Ake/active-signals"]);
  });

  it("parses a successful active-signals response", async () => {
    const result = await fetchRegionActiveSignals("country:ke", async () => {
      return Response.json(sampleActiveSignalsResponse);
    });

    expect(result.signals).toHaveLength(2);
    expect(result.signals[0].title).toBe("M 5.2 - Kenya region");
    expect(result.freshness[0].provider).toBe("usgs");
    expect(result.region.id).toBe("country:ke");
  });

  it("rejects a failed response", async () => {
    await expect(
      fetchRegionActiveSignals("country:ke", async () => {
        return new Response(null, { status: 404 });
      }),
    ).rejects.toThrow("Region active signals request failed with status 404");
  });

  it("rejects a malformed response", async () => {
    await expect(
      fetchRegionActiveSignals("country:ke", async () => {
        return Response.json({ region: { id: "country:ke" }, signals: "nope" });
      }),
    ).rejects.toThrow("Region active signals returned an invalid response");
  });

  it("rejects when region field is missing", async () => {
    await expect(
      fetchRegionActiveSignals("country:ke", async () => {
        return Response.json({ signals: [], freshness: [] });
      }),
    ).rejects.toThrow("Region active signals returned an invalid response");
  });
});
