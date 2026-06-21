import { z } from "zod";
import { isRegionId } from "./catalog";
import type { RegionId } from "./types";

export const regionIdSchema = z.string().refine((value): value is RegionId => isRegionId(value), {
  message: "Unknown region ID",
});

const nonEmptyString = z.string().trim().min(1);

export const factSourceSchema = z
  .object({
    label: nonEmptyString,
    url: z.string().url().optional(),
  })
  .strict();

export const countryOverviewFactsSchema = z
  .object({
    capital: z.string().nullable(),
    population: z.number().nullable(),
    languages: z.array(z.string()).nullable(),
    currencies: z.array(z.string()).nullable(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    flagEmoji: z.string().nullable(),
    gdpPerCapita: z.number().nullable(),
    populationDensity: z.number().nullable(),
  })
  .strict();

const groupOverviewFactsSchema = z
  .object({
    population: z.number().nullable(),
    languages: z.array(z.string()),
    currencies: z.array(z.string()),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    gdpPerCapita: z.number().nullable(),
    populationDensity: z.number().nullable(),
  })
  .strict();

const countrySearchResultSchema = z
  .object({
    id: regionIdSchema,
    kind: z.literal("country"),
    displayName: nonEmptyString,
    alpha2: z.string(),
  })
  .strict();

const groupSearchResultBase = {
  id: regionIdSchema,
  displayName: nonEmptyString,
  memberCountryIds: z.array(regionIdSchema),
  memberCount: z.number().min(0),
} as const;

const countryGroupSearchResultSchema = z
  .object({ ...groupSearchResultBase, kind: z.literal("country-group") })
  .strict();

const continentSearchResultSchema = z
  .object({ ...groupSearchResultBase, kind: z.literal("continent") })
  .strict();

export const regionSearchResultSchema = z.discriminatedUnion("kind", [
  countrySearchResultSchema,
  countryGroupSearchResultSchema,
  continentSearchResultSchema,
]);

const countryDossierRegionSchema = z
  .object({
    kind: z.literal("country"),
    id: regionIdSchema,
    displayName: nonEmptyString,
    alpha2: z.string(),
  })
  .strict();

const countryDossierSchema = z
  .object({
    region: countryDossierRegionSchema,
    overviewFacts: countryOverviewFactsSchema.nullable(),
    factSources: z.array(factSourceSchema),
  })
  .strict();

const groupDossierRegionSchema = z
  .object({
    kind: z.literal("country-group"),
    id: regionIdSchema,
    displayName: nonEmptyString,
    memberCount: z.number().min(0),
  })
  .strict();

const continentDossierRegionSchema = z
  .object({
    kind: z.literal("continent"),
    id: regionIdSchema,
    displayName: nonEmptyString,
    memberCount: z.number().min(0),
  })
  .strict();

const groupDossierSchema = z
  .object({
    region: groupDossierRegionSchema,
    overviewFacts: groupOverviewFactsSchema.nullable(),
    factSources: z.array(factSourceSchema),
  })
  .strict();

const continentDossierSchema = z
  .object({
    region: continentDossierRegionSchema,
    overviewFacts: groupOverviewFactsSchema.nullable(),
    factSources: z.array(factSourceSchema),
  })
  .strict();

export const regionDossierSchema = z.union([
  countryDossierSchema,
  groupDossierSchema,
  continentDossierSchema,
]);
