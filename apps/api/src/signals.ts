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
