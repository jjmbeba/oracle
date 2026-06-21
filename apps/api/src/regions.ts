import {
  getRegionById,
  getRegionDossier,
  getRegionMemberCountryIds,
  isRegionId,
  matchSignalsToRegion,
  scoreSignals,
  searchRegions,
  toRegionSearchResult,
  type SignalCategory,
} from "@oracle/domain";
import { Hono } from "hono";
import { SIGNAL_WINDOW_MS, type SignalFeedStore } from "./signals";

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

    const pairsByKey = new Map<string, { provider: string; category: SignalCategory }>();
    for (const s of signals) {
      pairsByKey.set(`${s.provider}:${s.category}`, { provider: s.provider, category: s.category });
    }
    const providerCategoryPairs = [...pairsByKey.values()];

    const freshnessEntries = await Promise.all(
      providerCategoryPairs.map(({ provider, category }) =>
        store.queryFreshness(provider, category),
      ),
    );

    const freshness = freshnessEntries.flatMap((entry) =>
      entry
        ? [
            {
              provider: entry.provider,
              category: entry.category,
              lastSuccessfulPollAt: entry.lastSuccessfulPollAt.toISOString(),
            },
          ]
        : [],
    );

    return context.json({
      region: toRegionSearchResult(region),
      signals,
      freshness,
    });
  });

  return router;
}

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
