import type { ProviderFreshness, schema } from "@oracle/db";
import { queryProviderFreshness, querySignalFeed } from "@oracle/db";
import {
  signalCategories,
  type NormalizedSignal,
  type SignalCategory,
} from "@oracle/domain";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Hono } from "hono";

type Database = PostgresJsDatabase<typeof schema>;

const SIGNAL_WINDOW_MS = 72 * 60 * 60 * 1000;

export type SignalFeedStore = {
  queryFeed(
    category: SignalCategory,
    since: Date,
  ): Promise<NormalizedSignal[]>;
  queryFreshness(
    provider: string,
    category: SignalCategory,
  ): Promise<ProviderFreshness | null>;
};

export function createDrizzleSignalFeedStore(
  db: Database,
): SignalFeedStore {
  return {
    queryFeed: (category, since) =>
      querySignalFeed(db, { category, since }),
    queryFreshness: (provider, category) =>
      queryProviderFreshness(db, provider, category),
  };
}

type SignalFeedOptions = {
  store: SignalFeedStore;
};

type FreshnessResponse = {
  provider: string;
  category: SignalCategory;
  lastSuccessfulPollAt: string;
};

export function createSignalFeedRoutes(options: SignalFeedOptions) {
  const router = new Hono();
  const { store } = options;

  router.get("/feed", async (c) => {
    const rawCategory = c.req.query("category");

    if (
      typeof rawCategory !== "string" ||
      !(signalCategories as readonly string[]).includes(rawCategory)
    ) {
      return c.json(
        {
          error: {
            code: "invalid_category",
            message: `Category must be one of: ${signalCategories.join(", ")}`,
          },
        },
        400,
      );
    }

    const category = rawCategory as SignalCategory;
    const since = new Date(Date.now() - SIGNAL_WINDOW_MS);

    const signals = await store.queryFeed(category, since);

    const providers = [
      ...new Set(signals.map((s) => s.provider)),
    ];

    const freshnessEntries = await Promise.all(
      providers.map((p) => store.queryFreshness(p, category)),
    );

    const freshness: FreshnessResponse[] = [];

    for (const entry of freshnessEntries) {
      if (entry) {
        freshness.push({
          provider: entry.provider,
          category: entry.category,
          lastSuccessfulPollAt: entry.lastSuccessfulPollAt.toISOString(),
        });
      }
    }

    return c.json({ signals, freshness });
  });

  return router;
}

export function createSignalMapRoutes(options: SignalFeedOptions) {
  const router = new Hono();
  const { store } = options;

  router.get("/map", async (c) => {
    const rawCategory = c.req.query("category");

    if (
      typeof rawCategory !== "string" ||
      !(signalCategories as readonly string[]).includes(rawCategory)
    ) {
      return c.json(
        {
          error: {
            code: "invalid_category",
            message: `Category must be one of: ${signalCategories.join(", ")}`,
          },
        },
        400,
      );
    }

    const category = rawCategory as SignalCategory;
    const since = new Date(Date.now() - SIGNAL_WINDOW_MS);
    const signals = await store.queryFeed(category, since);

    const features: Array<{
      type: "Feature";
      geometry: { type: "Point"; coordinates: [number, number] };
      properties: {
        id: string;
        provider: string;
        category: string;
        title: string;
        severity: string;
        confidence: string;
        effectiveAt: string;
        sourceLinkUrl?: string;
        sourceLinkLabel?: string;
      };
    }> = [];

    for (const signal of signals) {
      if (signal.scope.kind !== "point") continue;

      const [longitude, latitude] = signal.scope.coordinates;

      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [longitude, latitude] },
        properties: {
          id: signal.providerEventId ?? signal.dedupeKey,
          provider: signal.provider,
          category: signal.category,
          title: signal.title,
          severity: signal.severity,
          confidence: signal.confidence,
          effectiveAt: signal.effectiveAt,
          sourceLinkUrl: signal.sourceLink?.url,
          sourceLinkLabel: signal.sourceLink?.label,
        },
      });
    }

    return c.json({ type: "FeatureCollection", features });
  });

  return router;
}
