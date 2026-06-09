import { z } from "zod";
import { isRegionId } from "./catalog";
import type { RegionId } from "./types";

export const regionIdSchema = z
  .string()
  .refine((value): value is RegionId => isRegionId(value), {
    message: "Unknown region ID",
  });
