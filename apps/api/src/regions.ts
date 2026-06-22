import {
  getRegionById,
  getRegionDossier,
  getRegionMemberCountryIds,
  isRegionId,
  matchSignalsToRegion,
  normalizedSignalSchema,
  regionDossierSchema,
  regionSearchResultSchema,
  riskScoreSchema,
  scoreSignals,
  searchRegions,
  toRegionSearchResult,
  type NormalizedSignal,
} from "@oracle/domain";
import { Hono } from "hono";
import { z } from "zod";
import { SIGNAL_WINDOW_MS, freshnessEntrySchema, toFreshnessResponse, type SignalFeedStore } from "./signals";

const regionNotFound = () =>
  Response.json(
    {
      error: {
        code: "region_not_found",
        message: "Region not found",
      },
    },
    { status: 404 },
  );

export const regionsRoutes = new Hono();

regionsRoutes.get("/search", (context) => {
  return context.json({
    regions: searchRegions(context.req.query("q")),
  });
});

regionsRoutes.get("/:id", (context) => {
  const id = context.req.param("id");

  if (!isRegionId(id)) {
    return regionNotFound();
  }

  const region = getRegionById(id);

  if (!region) {
    return regionNotFound();
  }

  return context.json({
    region: toRegionSearchResult(region),
  });
});

regionsRoutes.get("/:id/dossier", (context) => {
  const id = context.req.param("id");

  if (!isRegionId(id)) {
    return regionNotFound();
  }

  const dossier = getRegionDossier(id);

  if (!dossier) {
    return regionNotFound();
  }

  return context.json({ dossier });
});

type ActiveSignalsRoutesOptions = {
  store: SignalFeedStore;
};

export function createRegionActiveSignalsRoutes(options: ActiveSignalsRoutesOptions) {
  const router = new Hono();
  const { store } = options;

  router.get("/:id/active-signals", async (context) => {
    const id = context.req.param("id");

    if (!isRegionId(id)) {
      return regionNotFound();
    }

    const region = getRegionById(id);

    if (!region) {
      return regionNotFound();
    }

    const memberCountryIds = getRegionMemberCountryIds(id);
    const since = new Date(Date.now() - SIGNAL_WINDOW_MS);

    const allSignals = await store.queryAllInWindow(since);
    const signals = matchSignalsToRegion(allSignals, memberCountryIds);

    const freshness = (await store.queryProviderFreshness(
      signals.map((s) => ({ provider: s.provider, category: s.category })),
    )).map(toFreshnessResponse);

    return context.json({
      region: toRegionSearchResult(region),
      signals,
      freshness,
    });
  });

  return router;
}

export const dossierResponseSchema = z
  .object({ dossier: regionDossierSchema })
  .strict();

export const regionActiveSignalsResponseSchema = z
  .object({
    region: regionSearchResultSchema,
    // ponytail: Zod v4 $strict brand incompatible with z.array — cast required
    signals: z.array(normalizedSignalSchema as z.ZodType<NormalizedSignal>),
    freshness: z.array(freshnessEntrySchema),
  })
  .strict();

export const regionRiskResponseSchema = z
  .object({
    region: regionSearchResultSchema,
    risk: riskScoreSchema,
  })
  .strict();

export function createRegionRiskRoutes(options: { store: SignalFeedStore }) {
  const router = new Hono();
  const { store } = options;

  router.get("/:id/risk", async (c) => {
    const id = c.req.param("id");

    if (!isRegionId(id)) {
      return regionNotFound();
    }

    const region = getRegionById(id);

    if (!region) {
      return regionNotFound();
    }

    const memberCountryIds = getRegionMemberCountryIds(id);
    const since = new Date(Date.now() - SIGNAL_WINDOW_MS);
    const matched = matchSignalsToRegion(await store.queryAllInWindow(since), memberCountryIds);

    return c.json({ region: toRegionSearchResult(region), risk: scoreSignals(matched) });
  });

  return router;
}
