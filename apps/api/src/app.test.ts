import { describe, expect, it } from "vitest";
import { app, createApp } from "./app";

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
});
