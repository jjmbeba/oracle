import { Hono, type MiddlewareHandler } from "hono";
import { describe, expect, it } from "vitest";
import {
  createRequireAuth,
  type AppBindings,
  type AuthSession,
  type SessionResolver,
} from "./auth-middleware";
import {
  changeReportGetResponseSchema,
  watchedRegionPostResponseSchema,
  watchedRegionsListResponseSchema,
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

    getLatestChangeReport: async () => undefined,
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

  describe("GET /:regionId/change-report", () => {
    it("returns null when no change report exists yet", async () => {
      const { store, app } = createTestApp();

      await store.insert({
        id: "wr-1",
        userId: "guest-user-id",
        regionId: "country:ke",
      });

      const response = await app.request("/country:ke/change-report");
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.changeReport).toBeNull();
    });

    it("returns 404 when the region is not watched", async () => {
      const { app } = createTestApp();

      const response = await app.request("/country:br/change-report");
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error.code).toBe("watched_region_not_found");
    });

    it("returns a change report when one exists", async () => {
      const store: WatchedRegionStore = {
        ...createInMemoryStore(),
        getLatestChangeReport: async () => ({
          id: "wr-1:2026-01-01T00:00:00.000Z",
          watchedRegionId: "wr-1",
          generatedAt: new Date("2026-01-01T00:00:00Z"),
          newSignals: [
            { dedupeKey: "sig:a", severity: "moderate", category: "earthquake", occurredAt: null },
          ],
          expiredSignals: [],
          severityChanges: [],
          riskMovement: null,
        }),
      };
      const auth = requireAuth;
      const app = new Hono<AppBindings>();
      app.use("*", auth);
      app.route("/", createWatchedRegionsRoutes({ store, requireAuth: auth }));

      await store.insert({
        id: "wr-1",
        userId: "guest-user-id",
        regionId: "country:ke",
      });

      const response = await app.request("/country:ke/change-report");
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.changeReport).not.toBeNull();
      expect(body.changeReport.generatedAt).toBe("2026-01-01T00:00:00.000Z");
      expect(body.changeReport.newSignals).toHaveLength(1);
      expect(body.changeReport.newSignals[0].dedupeKey).toBe("sig:a");
      expect(body.changeReport.expiredSignals).toEqual([]);
      expect(body.changeReport.severityChanges).toEqual([]);
      expect(body.changeReport.riskMovement).toBeNull();
    });

    it("returns a change report with all four fields populated", async () => {
      const store: WatchedRegionStore = {
        ...createInMemoryStore(),
        getLatestChangeReport: async () => ({
          id: "wr-1:full",
          watchedRegionId: "wr-1",
          generatedAt: new Date("2026-06-18T12:00:00Z"),
          newSignals: [
            {
              dedupeKey: "sig:new:1",
              severity: "moderate",
              category: "earthquake",
              occurredAt: "2026-06-18T11:00:00Z",
            },
            {
              dedupeKey: "sig:new:2",
              severity: "severe",
              category: "weather",
              occurredAt: null,
            },
          ],
          expiredSignals: [
            {
              dedupeKey: "sig:old:1",
              severity: "minor",
              category: "earthquake",
              occurredAt: "2026-06-17T10:00:00Z",
            },
          ],
          severityChanges: [
            {
              dedupeKey: "sig:changed:1",
              severity: "severe",
              category: "earthquake",
              occurredAt: null,
              fromSeverity: "moderate",
            },
          ],
          riskMovement: {
            fromScore: 15,
            toScore: 60,
            fromLevel: "watch",
            toLevel: "critical",
          },
        }),
      };
      const auth = requireAuth;
      const app = new Hono<AppBindings>();
      app.use("*", auth);
      app.route("/", createWatchedRegionsRoutes({ store, requireAuth: auth }));

      await store.insert({
        id: "wr-1",
        userId: "guest-user-id",
        regionId: "country:ke",
      });

      const response = await app.request("/country:ke/change-report");
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.changeReport).not.toBeNull();
      expect(body.changeReport.generatedAt).toBe("2026-06-18T12:00:00.000Z");
      expect(body.changeReport.newSignals).toHaveLength(2);
      expect(body.changeReport.expiredSignals).toHaveLength(1);
      expect(body.changeReport.severityChanges).toHaveLength(1);
      expect(body.changeReport.riskMovement).not.toBeNull();
      expect(body.changeReport.riskMovement.fromScore).toBe(15);
      expect(body.changeReport.riskMovement.toScore).toBe(60);
      expect(body.changeReport.riskMovement.fromLevel).toBe("watch");
      expect(body.changeReport.riskMovement.toLevel).toBe("critical");
    });
  });

  describe("contract", () => {
    it("list response matches schema", async () => {
      const { store, app } = createTestApp();

      await store.insert({
        id: "wr-list-1",
        userId: "guest-user-id",
        regionId: "country:ke",
      });

      const response = await app.request("/");
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(watchedRegionsListResponseSchema.safeParse(body).success).toBe(true);
    });

    it("post response matches schema", async () => {
      const { app } = createTestApp();

      const response = await app.request("/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ regionId: "country:ke" }),
      });

      const body = await response.json();

      expect(response.status).toBe(201);
      expect(watchedRegionPostResponseSchema.safeParse(body).success).toBe(true);
    });

    it("change-report response matches schema", async () => {
      const store: WatchedRegionStore = {
        ...createInMemoryStore(),
        getLatestChangeReport: async () => ({
          id: "wr-contract",
          watchedRegionId: "wr-1",
          generatedAt: new Date("2026-06-18T12:00:00Z"),
          newSignals: [],
          expiredSignals: [],
          severityChanges: [],
          riskMovement: null,
        }),
      };
      const auth = requireAuth;
      const app = new Hono<AppBindings>();
      app.use("*", auth);
      app.route("/", createWatchedRegionsRoutes({ store, requireAuth: auth }));

      await store.insert({
        id: "wr-1",
        userId: "guest-user-id",
        regionId: "country:ke",
      });

      const response = await app.request("/country:ke/change-report");
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(changeReportGetResponseSchema.safeParse(body).success).toBe(true);
    });
  });
});
