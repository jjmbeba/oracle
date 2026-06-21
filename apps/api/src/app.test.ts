import { describe, expect, it } from "vitest";
import type { ProviderFreshness } from "@oracle/db";
import type { NormalizedSignal } from "@oracle/domain";
import { app, createApp } from "./app";
import type { SignalFeedStore } from "./signals";

function makeSignal(overrides: Partial<NormalizedSignal>): NormalizedSignal {
  return {
    provider: "test-provider",
    dedupeKey: "signal:earthquake:test-provider:provider-native:test",
    category: "earthquake",
    title: "Test Signal",
    severity: "moderate",
    confidence: "medium",
    effectiveAt: new Date().toISOString(),
    scope: { kind: "global" },
    ...overrides,
  };
}

function signalFeedApp(
  signals: NormalizedSignal[],
  freshness?: ProviderFreshness | null,
  activeSignals?: NormalizedSignal[],
) {
  const store: SignalFeedStore = {
    queryFeed: async () => signals,
    queryFreshness: async () => freshness ?? null,
    queryAllInWindow: async () => activeSignals ?? signals,
  };
  return createApp({ signals: store });
}

describe("api shell", () => {
  it("exposes API health", async () => {
    const response = await app.request("/health");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      service: "api",
    });
  });

  it("starts without product routes yet", async () => {
    const response = await app.request("/");

    expect(response.status).toBe(404);
  });

  it("mounts injected Better Auth routes without requiring a database", async () => {
    const authApp = createApp({
      auth: {
        handler: async (request) => {
          const url = new URL(request.url);

          return Response.json({
            method: request.method,
            path: url.pathname,
          });
        },
      },
    });

    const response = await authApp.request("/api/auth/sign-in/anonymous", {
      method: "POST",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      method: "POST",
      path: "/api/auth/sign-in/anonymous",
    });
  });

  it("searches regions", async () => {
    const response = await app.request("/regions/search?q=kenya");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
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

  it("searches countries, country groups, and continents", async () => {
    const response = await app.request("/regions/search?q=africa");

    expect(response.status).toBe(200);

    const body = await response.json();
    const resultIds = body.regions.map((region: { id: string }) => region.id);

    expect(resultIds).toContain("country:za");
    expect(resultIds).toContain("group:eastern-africa");
    expect(resultIds).toContain("continent:africa");
  });

  it("returns curated default regions for blank searches", async () => {
    const response = await app.request("/regions/search");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      regions: [
        {
          id: "country:ke",
          kind: "country",
          displayName: "Kenya",
          alpha2: "KE",
        },
        {
          id: "country:za",
          kind: "country",
          displayName: "South Africa",
          alpha2: "ZA",
        },
        {
          id: "country:br",
          kind: "country",
          displayName: "Brazil",
          alpha2: "BR",
        },
        {
          id: "country:fr",
          kind: "country",
          displayName: "France",
          alpha2: "FR",
        },
        {
          id: "country:jp",
          kind: "country",
          displayName: "Japan",
          alpha2: "JP",
        },
        {
          id: "country:au",
          kind: "country",
          displayName: "Australia",
          alpha2: "AU",
        },
        {
          id: "continent:africa",
          kind: "continent",
          displayName: "Africa",
          memberCountryIds: expect.any(Array),
          memberCount: expect.any(Number),
        },
        {
          id: "group:eastern-africa",
          kind: "country-group",
          displayName: "Eastern Africa",
          memberCountryIds: expect.any(Array),
          memberCount: expect.any(Number),
        },
        {
          id: "continent:europe",
          kind: "continent",
          displayName: "Europe",
          memberCountryIds: expect.any(Array),
          memberCount: expect.any(Number),
        },
        {
          id: "continent:asia",
          kind: "continent",
          displayName: "Asia",
          memberCountryIds: expect.any(Array),
          memberCount: expect.any(Number),
        },
      ],
    });
  });

  it("returns a selectable country by ID", async () => {
    const response = await app.request("/regions/country:ke");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      region: {
        id: "country:ke",
        kind: "country",
        displayName: "Kenya",
        alpha2: "KE",
      },
    });
  });

  it("returns membership fields for grouped regions", async () => {
    const response = await app.request("/regions/group:eastern-africa");

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.region).toEqual({
      id: "group:eastern-africa",
      kind: "country-group",
      displayName: "Eastern Africa",
      memberCountryIds: expect.any(Array),
      memberCount: expect.any(Number),
    });
    expect(body.region.memberCountryIds).toContain("country:ke");
    expect(body.region.memberCount).toBe(body.region.memberCountryIds.length);
  });

  it("returns a clear not-found response for unknown regions", async () => {
    const response = await app.request("/regions/banana");

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "region_not_found",
        message: "Region not found",
      },
    });
  });

  it("returns dossier facts for a country", async () => {
    const response = await app.request("/regions/country:ke/dossier");

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.dossier).toBeDefined();
    expect(body.dossier.region).toEqual({
      kind: "country",
      id: "country:ke",
      displayName: "Kenya",
      alpha2: "KE",
    });
    expect(body.dossier.overviewFacts).not.toBeNull();
    expect(body.dossier.overviewFacts.capital).toBe("Nairobi");
    expect(body.dossier.factSources.length).toBeGreaterThanOrEqual(1);
  });

  it("returns aggregated dossier facts for a country group", async () => {
    const response = await app.request("/regions/group:eastern-africa/dossier");

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.dossier.region.kind).toBe("country-group");
    expect(body.dossier.region.displayName).toBe("Eastern Africa");
    expect(body.dossier.overviewFacts.population).toBeGreaterThan(100_000_000);
  });

  it("returns aggregated dossier facts for a continent", async () => {
    const response = await app.request("/regions/continent:africa/dossier");

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.dossier.region.kind).toBe("continent");
    expect(body.dossier.region.displayName).toBe("Africa");
    expect(body.dossier.overviewFacts.population).toBeGreaterThan(1_000_000_000);
  });

  it("returns 404 for unknown region dossier", async () => {
    const response = await app.request("/regions/banana/dossier");

    expect(response.status).toBe(404);
  });
});

describe("signal feed", () => {
  it("returns signals and freshness for a valid category", async () => {
    const signal = makeSignal({ title: "M 5.2 Test" });
    const testApp = signalFeedApp([signal], {
      provider: "test-provider",
      category: "earthquake",
      lastSuccessfulPollAt: new Date("2026-06-18T12:00:00Z"),
    });

    const response = await testApp.request("/signals/feed?category=earthquake");

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.signals).toHaveLength(1);
    expect(body.signals[0].title).toBe("M 5.2 Test");
    expect(body.freshness).toHaveLength(1);
    expect(body.freshness[0].lastSuccessfulPollAt).toBe("2026-06-18T12:00:00.000Z");
  });

  it("returns empty signals and empty freshness when no data", async () => {
    const testApp = signalFeedApp([], null);

    const response = await testApp.request("/signals/feed?category=earthquake");

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.signals).toEqual([]);
    expect(body.freshness).toEqual([]);
  });

  it("returns 400 for invalid category", async () => {
    const testApp = signalFeedApp([], null);
    const response = await testApp.request("/signals/feed?category=invalid");

    expect(response.status).toBe(400);

    const body = await response.json();

    expect(body.error.code).toBe("invalid_category");
  });

  it("returns 400 when category is missing", async () => {
    const testApp = signalFeedApp([], null);
    const response = await testApp.request("/signals/feed");

    expect(response.status).toBe(400);

    const body = await response.json();

    expect(body.error.code).toBe("invalid_category");
  });

  it("passes signals through from the store in store order", async () => {
    const signalA = makeSignal({
      dedupeKey: "sig:a",
      title: "Signal A",
    });
    const signalB = makeSignal({
      dedupeKey: "sig:b",
      title: "Signal B",
    });
    const testApp = signalFeedApp([signalA, signalB]);

    const response = await testApp.request("/signals/feed?category=earthquake");

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.signals).toHaveLength(2);
    expect(body.signals[0].title).toBe("Signal A");
    expect(body.signals[1].title).toBe("Signal B");
  });

  it("includes per-provider freshness when signals exist", async () => {
    const signalA = makeSignal({
      dedupeKey: "signal:earthquake:prov-a:provider-native:a",
      title: "From A",
      provider: "prov-a",
    });
    const signalB = makeSignal({
      dedupeKey: "signal:earthquake:prov-b:provider-native:b",
      title: "From B",
      provider: "prov-b",
    });
    const store: SignalFeedStore = {
      queryFeed: async () => [signalA, signalB],
      queryFreshness: async (provider) => {
        if (provider === "prov-a") {
          return {
            provider: "prov-a",
            category: "earthquake",
            lastSuccessfulPollAt: new Date("2026-06-18T12:00:00Z"),
          };
        }
        return null;
      },
    };
    const testApp = createApp({ signals: store });

    const response = await testApp.request("/signals/feed?category=earthquake");

    expect(response.status).toBe(200);

    const body = await response.json();
    const providers = body.freshness.map((f: { provider: string }) => f.provider);

    expect(providers).toEqual(["prov-a"]);
  });

  it("returns space-weather signals and freshness for that category", async () => {
    const swpcSignal: NormalizedSignal = {
      provider: "noaa-swpc",
      dedupeKey: "signal:space-weather:noaa-swpc:provider-derived:altk04+%2F+2666",
      providerEventId: "K04A",
      category: "space-weather",
      title: "ALERT: Geomagnetic K-index of 4",
      severity: "minor",
      confidence: "high",
      effectiveAt: new Date("2026-06-13T21:01:31Z").toISOString(),
      scope: { kind: "global" },
      sourceLink: {
        url: "https://www.swpc.noaa.gov/products/alerts-watches-and-warnings",
        label: "NOAA SWPC Alert",
      },
    };
    const testApp = signalFeedApp([swpcSignal], {
      provider: "noaa-swpc",
      category: "space-weather",
      lastSuccessfulPollAt: new Date("2026-06-13T21:01:35Z"),
    });

    const response = await testApp.request("/signals/feed?category=space-weather");

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.signals).toHaveLength(1);
    expect(body.signals[0].category).toBe("space-weather");
    expect(body.signals[0].scope).toEqual({ kind: "global" });
    expect(body.freshness).toHaveLength(1);
    expect(body.freshness[0]).toEqual({
      provider: "noaa-swpc",
      category: "space-weather",
      lastSuccessfulPollAt: "2026-06-13T21:01:35.000Z",
    });
  });
});

describe("signal map", () => {
  it("returns GeoJSON FeatureCollection with point-scoped signals", async () => {
    const signal = makeSignal({
      title: "M 5.2 Test",
      scope: { kind: "point", coordinates: [36.81, -1.28] },
    });
    const testApp = signalFeedApp([signal], null);

    const response = await testApp.request("/signals/map?category=earthquake");

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.type).toBe("FeatureCollection");
    expect(body.features).toHaveLength(1);

    const feature = body.features[0];

    expect(feature.type).toBe("Feature");
    expect(feature.geometry.type).toBe("Point");
    expect(feature.geometry.coordinates).toEqual([36.81, -1.28]);
    expect(feature.properties.title).toBe("M 5.2 Test");
  });

  it("includes proper signal id when providerEventId is present", async () => {
    const signal = makeSignal({
      providerEventId: "usgs:abc123",
      scope: { kind: "point", coordinates: [0, 0] },
    });
    const testApp = signalFeedApp([signal], null);

    const response = await testApp.request("/signals/map?category=earthquake");
    const body = await response.json();

    expect(body.features[0].id).toBe("usgs:abc123");
  });

  it("falls back to dedupeKey when providerEventId is absent", async () => {
    const signal = makeSignal({
      providerEventId: undefined,
      dedupeKey: "signal:earthquake:test:fallback",
      scope: { kind: "point", coordinates: [0, 0] },
    });
    const testApp = signalFeedApp([signal], null);

    const response = await testApp.request("/signals/map?category=earthquake");
    const body = await response.json();

    expect(body.features[0].id).toBe("signal:earthquake:test:fallback");
  });

  it("includes severity, confidence, category, and source data in properties", async () => {
    const signal = makeSignal({
      provider: "usgs",
      category: "earthquake",
      title: "M 6.1 Test",
      severity: "severe",
      confidence: "high",
      scope: { kind: "point", coordinates: [139.65, 35.68] },
      sourceLink: {
        url: "https://earthquake.usgs.gov/example",
        label: "USGS",
      },
    });
    const testApp = signalFeedApp([signal], null);

    const response = await testApp.request("/signals/map?category=earthquake");
    const body = await response.json();
    const props = body.features[0].properties;

    expect(props.severity).toBe("severe");
    expect(props.confidence).toBe("high");
    expect(props.category).toBe("earthquake");
    expect(props.sourceLinkUrl).toBe("https://earthquake.usgs.gov/example");
    expect(props.sourceLinkLabel).toBe("USGS");
  });

  it("returns empty FeatureCollection when no signals exist", async () => {
    const testApp = signalFeedApp([], null);

    const response = await testApp.request("/signals/map?category=earthquake");

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.type).toBe("FeatureCollection");
    expect(body.features).toEqual([]);
  });

  it("skips non-point scoped signals", async () => {
    const globalSignal = makeSignal({
      title: "Global",
      scope: { kind: "global" },
    });
    const pointSignal = makeSignal({
      title: "Point",
      dedupeKey: "sig:point",
      scope: { kind: "point", coordinates: [0, 0] },
    });
    const testApp = signalFeedApp([globalSignal, pointSignal], null);

    const response = await testApp.request("/signals/map?category=earthquake");
    const body = await response.json();

    expect(body.features).toHaveLength(1);
    expect(body.features[0].properties.title).toBe("Point");
  });

  it("returns 400 for invalid category", async () => {
    const testApp = signalFeedApp([], null);

    const response = await testApp.request("/signals/map?category=invalid");

    expect(response.status).toBe(400);

    const body = await response.json();

    expect(body.error.code).toBe("invalid_category");
  });

  it("returns 400 when category is missing", async () => {
    const testApp = signalFeedApp([], null);

    const response = await testApp.request("/signals/map");

    expect(response.status).toBe(400);

    const body = await response.json();

    expect(body.error.code).toBe("invalid_category");
  });

  it("returns an empty FeatureCollection for space-weather (global context, no map precision)", async () => {
    const globalSpaceWeather = makeSignal({
      provider: "noaa-swpc",
      category: "space-weather",
      title: "Geomagnetic K-index of 4",
      severity: "minor",
      confidence: "high",
      scope: { kind: "global" },
    });
    const testApp = signalFeedApp([globalSpaceWeather], null);

    const response = await testApp.request("/signals/map?category=space-weather");

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.type).toBe("FeatureCollection");
    expect(body.features).toEqual([]);
  });
});

describe("region active signals", () => {
  it("returns region-scoped and global active signals for a country", async () => {
    const regionSignal = makeSignal({
      dedupeKey: "sig:region:ke",
      title: "Kenya regional signal",
      scope: { kind: "region", regionId: "country:ke" },
    });
    const globalSignal = makeSignal({
      provider: "noaa-swpc",
      dedupeKey: "sig:global:swpc",
      title: "Geomagnetic storm",
      category: "space-weather",
      scope: { kind: "global" },
    });
    const testApp = signalFeedApp([], null, [regionSignal, globalSignal]);

    const response = await testApp.request("/regions/country:ke/active-signals");

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.region).toEqual({
      id: "country:ke",
      kind: "country",
      displayName: "Kenya",
      alpha2: "KE",
    });
    expect(body.signals).toHaveLength(2);
    const titles = body.signals.map((s: { title: string }) => s.title);
    expect(titles).toContain("Kenya regional signal");
    expect(titles).toContain("Geomagnetic storm");
  });

  it("matches point signals to a country via bounding box", async () => {
    // Tokyo sits inside Japan's bounds (129.41, 31.03, 145.54, 45.55)
    const tokyoSignal = makeSignal({
      provider: "openweather",
      dedupeKey: "sig:openweather:tokyo",
      title: "Tokyo thunderstorm",
      category: "weather",
      scope: { kind: "point", coordinates: [139.65, 35.68] },
    });
    // Nairobi sits outside Japan's bounds; should be excluded
    const nairobiSignal = makeSignal({
      provider: "openweather",
      dedupeKey: "sig:openweather:nairobi",
      title: "Nairobi thunderstorm",
      category: "weather",
      scope: { kind: "point", coordinates: [36.82, -1.29] },
    });
    const testApp = signalFeedApp([], null, [tokyoSignal, nairobiSignal]);

    const response = await testApp.request("/regions/country:jp/active-signals");

    expect(response.status).toBe(200);

    const body = await response.json();

    const titles = body.signals.map((s: { title: string }) => s.title);
    expect(titles).toContain("Tokyo thunderstorm");
    expect(titles).not.toContain("Nairobi thunderstorm");
  });

  it("matches point signals to any member country of a group", async () => {
    // Nairobi is in Kenya, which is a member of Eastern Africa
    const nairobiSignal = makeSignal({
      provider: "openweather",
      dedupeKey: "sig:ea:nairobi",
      title: "Nairobi storm",
      category: "weather",
      scope: { kind: "point", coordinates: [36.82, -1.29] },
    });
    // Berlin is in Germany, NOT in Eastern Africa
    const berlinSignal = makeSignal({
      provider: "openweather",
      dedupeKey: "sig:ea:berlin",
      title: "Berlin storm",
      category: "weather",
      scope: { kind: "point", coordinates: [13.4, 52.52] },
    });
    const testApp = signalFeedApp([], null, [nairobiSignal, berlinSignal]);

    const response = await testApp.request("/regions/group:eastern-africa/active-signals");

    expect(response.status).toBe(200);

    const body = await response.json();
    const titles = body.signals.map((s: { title: string }) => s.title);
    expect(titles).toContain("Nairobi storm");
    expect(titles).not.toContain("Berlin storm");
  });

  it("returns empty arrays when no active signals exist", async () => {
    const testApp = signalFeedApp([], null, []);

    const response = await testApp.request("/regions/country:ke/active-signals");

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.signals).toEqual([]);
    expect(body.freshness).toEqual([]);
  });

  it("returns 404 for unknown region", async () => {
    const testApp = signalFeedApp([], null, []);

    const response = await testApp.request("/regions/banana/active-signals");

    expect(response.status).toBe(404);

    const body = await response.json();

    expect(body.error.code).toBe("region_not_found");
  });

  it("fetches signals and freshness in parallel", async () => {
    const order: string[] = [];
    const regionSignal = makeSignal({
      provider: "usgs",
      dedupeKey: "sig:parallel",
      title: "Parallel test",
      scope: { kind: "region", regionId: "country:ke" },
    });
    const store: SignalFeedStore = {
      queryFeed: async () => {
        order.push("feed");
        return [];
      },
      queryFreshness: async () => {
        order.push("freshness");
        return {
          provider: "usgs",
          category: "earthquake",
          lastSuccessfulPollAt: new Date("2026-06-18T12:00:00Z"),
        };
      },
      queryAllInWindow: async () => {
        order.push("active");
        return [regionSignal];
      },
    };
    const testApp = createApp({ signals: store });

    const response = await testApp.request("/regions/country:ke/active-signals");

    expect(response.status).toBe(200);
    expect(order[0]).toBe("active");
    expect(order).toContain("freshness");
  });

  it("returns freshness per provider in the response", async () => {
    const signal = makeSignal({
      provider: "usgs",
      dedupeKey: "sig:provider-freshness",
      title: "Provider test",
      scope: { kind: "region", regionId: "country:ke" },
    });
    const testApp = signalFeedApp(
      [],
      {
        provider: "usgs",
        category: "earthquake",
        lastSuccessfulPollAt: new Date("2026-06-18T12:00:00Z"),
      },
      [signal],
    );

    const response = await testApp.request("/regions/country:ke/active-signals");

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.freshness).toHaveLength(1);
    expect(body.freshness[0]).toEqual({
      provider: "usgs",
      category: "earthquake",
      lastSuccessfulPollAt: "2026-06-18T12:00:00.000Z",
    });
  });
});

describe("region risk", () => {
  it("returns risk score and level for a valid region", async () => {
    const signals = [
      makeSignal({
        dedupeKey: "sig:risk:ke",
        title: "Kenya test signal",
        severity: "moderate",
        scope: { kind: "region", regionId: "country:ke" },
      }),
    ];
    const testApp = signalFeedApp([], null, signals);

    const response = await testApp.request("/regions/country:ke/risk");

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.region.id).toBe("country:ke");
    expect(body.risk.score).toBeGreaterThanOrEqual(0);
    expect(body.risk.score).toBeLessThanOrEqual(100);
    expect(body.risk.level).toMatch(/^(quiet|watch|elevated|high|critical)$/);
    expect(body.risk.worstSeverity).toBe("moderate");
    expect(body.risk.contributingSignals).toBe(1);
  });

  it("returns 404 for an unknown region risk request", async () => {
    const testApp = signalFeedApp([], null, []);

    const response = await testApp.request("/regions/banana/risk");

    expect(response.status).toBe(404);

    const body = await response.json();

    expect(body.error.code).toBe("region_not_found");
  });
});
