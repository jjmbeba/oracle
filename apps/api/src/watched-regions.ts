import { watchedRegion } from "@oracle/db";
import { getRegionById, isRegionId, toRegionSearchResult, type RegionId } from "@oracle/domain";
import { and, count, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { randomUUID } from "node:crypto";
import type { AppBindings } from "./auth-middleware";
import { getAuthenticatedUser } from "./auth-middleware";

const MAX_WATCHED_REGIONS = 10;

export type WatchedRegionRow = {
  id: string;
  userId: string;
  regionId: string;
  createdAt: Date;
};

export type WatchedRegionStore = {
  listByUser(userId: string): Promise<WatchedRegionRow[]>;
  findByUserAndRegion(userId: string, regionId: string): Promise<WatchedRegionRow | undefined>;
  countByUser(userId: string): Promise<number>;
  insert(row: { id: string; userId: string; regionId: string }): Promise<void>;
  deleteByUserAndRegion(userId: string, regionId: string): Promise<void>;
};

export function createDrizzleWatchedRegionStore<T extends Record<string, unknown>>(
  db: PostgresJsDatabase<T>,
): WatchedRegionStore {
  return {
    listByUser: async (userId) =>
      db
        .select()
        .from(watchedRegion)
        .where(eq(watchedRegion.userId, userId))
        .orderBy(watchedRegion.createdAt),

    findByUserAndRegion: async (userId, regionId) => {
      const rows = await db
        .select()
        .from(watchedRegion)
        .where(and(eq(watchedRegion.userId, userId), eq(watchedRegion.regionId, regionId)))
        .limit(1);

      return rows[0];
    },

    countByUser: async (userId) => {
      const [{ count: total }] = await db
        .select({ count: count() })
        .from(watchedRegion)
        .where(eq(watchedRegion.userId, userId));

      return total;
    },

    insert: async (row) => {
      await db.insert(watchedRegion).values(row);
    },

    deleteByUserAndRegion: async (userId, regionId) => {
      await db
        .delete(watchedRegion)
        .where(and(eq(watchedRegion.userId, userId), eq(watchedRegion.regionId, regionId)));
    },
  };
}

type WatchedRegionsOptions = {
  store: WatchedRegionStore;
  requireAuth: MiddlewareHandler<AppBindings>;
};

export function createWatchedRegionsRoutes(options: WatchedRegionsOptions) {
  const router = new Hono<AppBindings>();
  const { store, requireAuth } = options;

  router.use("*", requireAuth);

  router.get("/", async (c) => {
    const user = getAuthenticatedUser(c);
    const rows = await store.listByUser(user.id);

    return c.json({ watchedRegions: rows.map(toWatchedRegionResponse) });
  });

  router.post("/", async (c) => {
    const user = getAuthenticatedUser(c);

    let body: { regionId?: unknown };

    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: { code: "invalid_body", message: "Invalid request body" } }, 400);
    }

    const { regionId } = body;

    if (typeof regionId !== "string" || !isRegionId(regionId)) {
      return c.json({ error: { code: "region_not_found", message: "Region not found" } }, 404);
    }

    const existing = await store.findByUserAndRegion(user.id, regionId);

    if (existing) {
      return c.json(
        { error: { code: "already_watched", message: "Region is already watched" } },
        409,
      );
    }

    const currentCount = await store.countByUser(user.id);

    if (currentCount >= MAX_WATCHED_REGIONS) {
      return c.json(
        {
          error: {
            code: "watch_limit_reached",
            message: "Cannot watch more than 10 regions",
          },
        },
        400,
      );
    }

    const id = randomUUID();

    await store.insert({ id, userId: user.id, regionId });

    return c.json({ watchedRegion: enrichWatchedRegion(id, regionId, new Date()) }, 201);
  });

  router.delete("/:regionId", async (c) => {
    const user = getAuthenticatedUser(c);
    const regionId = c.req.param("regionId");

    const existing = await store.findByUserAndRegion(user.id, regionId);

    if (!existing) {
      return c.json(
        {
          error: {
            code: "watched_region_not_found",
            message: "Watched region not found",
          },
        },
        404,
      );
    }

    await store.deleteByUserAndRegion(user.id, regionId);

    return c.json({ success: true });
  });

  return router;
}

function toWatchedRegionResponse(row: WatchedRegionRow) {
  return enrichWatchedRegion(row.id, row.regionId, row.createdAt);
}

function enrichWatchedRegion(id: string, regionId: string, createdAt: Date) {
  const region = getRegionById(regionId as RegionId);

  return {
    id,
    regionId,
    region: region ? toRegionSearchResult(region) : null,
    createdAt: createdAt.toISOString(),
  };
}
