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
) {
  const store: SignalFeedStore = {
    queryFeed: async () => signals,
    queryFreshness: async () => freshness ?? null,
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
    expect(body.freshness[0].lastSuccessfulPollAt).toBe(
      "2026-06-18T12:00:00.000Z",
    );
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
    const providers = body.freshness.map(
      (f: { provider: string }) => f.provider,
    );

    expect(providers).toEqual(["prov-a"]);
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

    expect(body.features[0].id).toBe(
      "signal:earthquake:test:fallback",
    );
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
});
