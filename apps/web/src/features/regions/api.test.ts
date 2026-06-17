import { describe, expect, it } from "vitest";
import type { CountryDossierFacts } from "./api";
import { REGION_SEARCH_PATH, fetchRegionDossier, fetchRegionSearch } from "./api";

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
