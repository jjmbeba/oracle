import {
  getRegionById,
  getRegionDossier,
  isRegionId,
  searchRegions,
  toRegionSearchResult,
} from "@oracle/domain";
import { Hono } from "hono";

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
