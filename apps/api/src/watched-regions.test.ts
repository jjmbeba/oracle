import { Hono, type MiddlewareHandler } from "hono";
import { describe, expect, it } from "vitest";
import {
  createRequireAuth,
  type AppBindings,
  type AuthSession,
  type SessionResolver,
} from "./auth-middleware";
import {
  createWatchedRegionsRoutes,
  type WatchedRegionRow,
  type WatchedRegionStore,
} from "./watched-regions";

const guestSession = {
  user: {
    id: "guest-user-id",
    name: "Anonymous",
    email: "guest@example.com",
    emailVerified: false,
    image: null,
    isAnonymous: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
  session: {
    id: "session-id",
    token: "session-token",
    userId: "guest-user-id",
    expiresAt: new Date("2026-01-08T00:00:00.000Z"),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ipAddress: null,
    userAgent: null,
  },
} satisfies AuthSession;

function createInMemoryStore(): WatchedRegionStore {
  const data: WatchedRegionRow[] = [];

  return {
    listByUser: async (userId) => data.filter((r) => r.userId === userId),
    findByUserAndRegion: async (userId, regionId) =>
      data.find((r) => r.userId === userId && r.regionId === regionId),
    countByUser: async (userId) => data.filter((r) => r.userId === userId).length,
    insert: async (row) => {
      data.push({ ...row, createdAt: new Date() });
    },
    deleteByUserAndRegion: async (userId, regionId) => {
      const idx = data.findIndex((r) => r.userId === userId && r.regionId === regionId);

      if (idx !== -1) {
        data.splice(idx, 1);
      }
    },
  };
}

function createTestApp(overrides?: { requireAuth?: MiddlewareHandler<AppBindings> }) {
  const store = createInMemoryStore();
  const auth = overrides?.requireAuth ?? requireAuth;
  const app = new Hono<AppBindings>();
  app.use("*", auth);
  app.route("/", createWatchedRegionsRoutes({ store, requireAuth: auth }));
  return { store, app };
}

const guestResolver: SessionResolver = async () => guestSession;
const requireAuth = createRequireAuth(guestResolver);

describe("watched regions", () => {
  describe("GET /", () => {
    it("returns an empty list when nothing is watched", async () => {
      const { app } = createTestApp();

      const response = await app.request("/");
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.watchedRegions).toEqual([]);
    });

    it("returns watched regions enriched with catalog data", async () => {
      const { store, app } = createTestApp();

      await store.insert({
        id: "wr-1",
        userId: "guest-user-id",
        regionId: "country:ke",
      });
      await store.insert({
        id: "wr-2",
        userId: "guest-user-id",
        regionId: "group:eastern-africa",
      });

      const response = await app.request("/");
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.watchedRegions).toHaveLength(2);
      expect(body.watchedRegions[0].regionId).toBe("country:ke");
      expect(body.watchedRegions[0].region).toMatchObject({
        id: "country:ke",
        kind: "country",
        displayName: "Kenya",
        alpha2: "KE",
      });
      expect(body.watchedRegions[1].regionId).toBe("group:eastern-africa");
      expect(body.watchedRegions[1].region).toMatchObject({
        id: "group:eastern-africa",
        kind: "country-group",
        displayName: "Eastern Africa",
      });
    });
  });

  describe("POST /", () => {
    it("adds a valid region and returns 201 with enriched data", async () => {
      const { app } = createTestApp();

      const response = await app.request("/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ regionId: "country:ke" }),
      });

      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.watchedRegion.regionId).toBe("country:ke");
      expect(body.watchedRegion.region).toMatchObject({
        id: "country:ke",
        kind: "country",
        displayName: "Kenya",
      });
      expect(body.watchedRegion.id).toEqual(expect.any(String));
      expect(body.watchedRegion.createdAt).toEqual(expect.any(String));
    });

    it("returns 409 when the region is already watched", async () => {
      const { store, app } = createTestApp();

      await store.insert({
        id: "wr-1",
        userId: "guest-user-id",
        regionId: "country:ke",
      });

      const response = await app.request("/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ regionId: "country:ke" }),
      });

      const body = await response.json();

      expect(response.status).toBe(409);
      expect(body.error.code).toBe("already_watched");
    });

    it("returns 400 when the user already has 10 watched regions", async () => {
      const { store, app } = createTestApp();

      for (let i = 0; i < 10; i++) {
        await store.insert({
          id: `wr-${i}`,
          userId: "guest-user-id",
          regionId: `country:a${"a".repeat(i)}`,
        });
      }

      const response = await app.request("/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ regionId: "country:br" }),
      });

      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe("watch_limit_reached");
    });

    it("returns 404 when the region does not exist", async () => {
      const { app } = createTestApp();

      const response = await app.request("/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ regionId: "country:zz" }),
      });

      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error.code).toBe("region_not_found");
    });

    it("returns 404 for a malformed region ID", async () => {
      const { app } = createTestApp();

      const response = await app.request("/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ regionId: "banana" }),
      });

      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error.code).toBe("region_not_found");
    });

    it("returns 400 for invalid request body", async () => {
      const { app } = createTestApp();

      const response = await app.request("/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "not json",
      });

      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe("invalid_body");
    });

    it("returns 400 for missing regionId in body", async () => {
      const { app } = createTestApp();

      const response = await app.request("/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });

      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error.code).toBe("region_not_found");
    });
  });

  describe("DELETE /:regionId", () => {
    it("removes a watched region and returns success", async () => {
      const { store, app } = createTestApp();

      await store.insert({
        id: "wr-1",
        userId: "guest-user-id",
        regionId: "country:ke",
      });

      const response = await app.request("/country:ke", { method: "DELETE" });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);

      const remaining = await store.listByUser("guest-user-id");

      expect(remaining).toHaveLength(0);
    });

    it("returns 404 when the region is not in the watchlist", async () => {
      const { app } = createTestApp();

      const response = await app.request("/country:br", { method: "DELETE" });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error.code).toBe("watched_region_not_found");
    });
  });

  describe("authentication", () => {
    it("returns 401 when no session exists", async () => {
      const noAuth: SessionResolver = async () => null;
      const { app } = createTestApp({ requireAuth: createRequireAuth(noAuth) });

      const response = await app.request("/");

      expect(response.status).toBe(401);
    });
  });
});
