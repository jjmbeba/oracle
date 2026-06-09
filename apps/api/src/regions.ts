import {
  getRegionById,
  isRegionId,
  searchRegions,
  toRegionSearchResult,
} from "@oracle/domain";
import { Hono } from "hono";

export const regionsRoutes = new Hono();

regionsRoutes.get("/search", (context) => {
  return context.json({
    regions: searchRegions(context.req.query("q")),
  });
});

regionsRoutes.get("/:id", (context) => {
  const id = context.req.param("id");

  if (!isRegionId(id)) {
    return context.json(
      {
        error: {
          code: "region_not_found",
          message: "Region not found",
        },
      },
      404,
    );
  }

  const region = getRegionById(id);

  if (!region) {
    return context.json(
      {
        error: {
          code: "region_not_found",
          message: "Region not found",
        },
      },
      404,
    );
  }

  return context.json({
    region: toRegionSearchResult(region),
  });
});
