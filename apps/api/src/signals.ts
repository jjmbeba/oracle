import type { ProviderFreshness, schema } from "@oracle/db";
import { queryProviderFreshness, querySignalFeed, querySignals } from "@oracle/db";
import {
  normalizedSignalSchema,
  signalCategories,
  type NormalizedSignal,
  type SignalCategory,
} from "@oracle/domain";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Hono } from "hono";
import { z } from "zod";

type Database = PostgresJsDatabase<typeof schema>;

export const SIGNAL_WINDOW_MS = 72 * 60 * 60 * 1000;

export type SignalFeedStore = {
  queryFeed(category: SignalCategory, since: Date): Promise<NormalizedSignal[]>;
  queryFreshness(provider: string, category: SignalCategory): Promise<ProviderFreshness | null>;
  queryAllInWindow(since: Date): Promise<NormalizedSignal[]>;
};

export function createDrizzleSignalFeedStore(db: Database): SignalFeedStore {
  return {
    queryFeed: (category, since) => querySignalFeed(db, { category, since }),
    queryFreshness: (provider, category) => queryProviderFreshness(db, provider, category),
    queryAllInWindow: (since) => querySignals(db, { since }),
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

export const freshnessEntrySchema = z
  .object({
    provider: z.string().trim().min(1),
    category: z.string().trim().min(1),
    lastSuccessfulPollAt: z.string(),
  })
  .strict();

export const signalFeedResponseSchema = z
  .object({
    signals: z.array(normalizedSignalSchema as z.ZodType<NormalizedSignal>),
    freshness: z.array(freshnessEntrySchema as z.ZodType),
  })
  .strict();

const pointFeatureSchema = z
  .object({
    type: z.literal("Feature"),
    id: z.string(),
    geometry: z
      .object({
        type: z.literal("Point"),
        coordinates: z.tuple([z.number(), z.number()]),
      })
      .strict(),
    properties: z
      .object({
        provider: z.string(),
        category: z.string(),
        title: z.string(),
        severity: z.string(),
        confidence: z.string(),
        effectiveAt: z.string(),
        sourceLinkUrl: z.string().optional(),
        sourceLinkLabel: z.string().optional(),
      })
      .strict(),
  })
  .strict();

export const signalMapResponseSchema = z
  .object({
    type: z.literal("FeatureCollection"),
    features: z.array(pointFeatureSchema as z.ZodType),
  })
  .strict();

function parseCategoryParam(raw: string | undefined): SignalCategory | null {
  if (typeof raw === "string" && (signalCategories as readonly string[]).includes(raw)) {
    return raw as SignalCategory;
  }
  return null;
}

export function createSignalFeedRoutes(options: SignalFeedOptions) {
  const router = new Hono();
  const { store } = options;

  router.get("/feed", async (c) => {
    const category = parseCategoryParam(c.req.query("category"));

    if (!category) {
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
    const since = new Date(Date.now() - SIGNAL_WINDOW_MS);

    const signals = await store.queryFeed(category, since);

    const providers = [...new Set(signals.map((s) => s.provider))];

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
    const category = parseCategoryParam(c.req.query("category"));

    if (!category) {
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
    const since = new Date(Date.now() - SIGNAL_WINDOW_MS);
    const signals = await store.queryFeed(category, since);

    type GeoJsonFeature = {
      type: "Feature";
      id: string;
      geometry: { type: "Point"; coordinates: [number, number] };
      properties: {
        provider: string;
        category: string;
        title: string;
        severity: string;
        confidence: string;
        effectiveAt: string;
        sourceLinkUrl?: string;
        sourceLinkLabel?: string;
      };
    };

    const features: GeoJsonFeature[] = [];

    for (const signal of signals) {
      if (signal.scope.kind !== "point") continue;

      const [longitude, latitude] = signal.scope.coordinates;

      features.push({
        type: "Feature",
        id: signal.providerEventId ?? signal.dedupeKey,
        geometry: { type: "Point", coordinates: [longitude, latitude] },
        properties: {
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
