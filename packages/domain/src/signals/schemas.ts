import { z } from "zod";
import { regionIdSchema } from "../region-catalog";
import { signalCategories, signalConfidences, signalScopes, signalSeverities } from "./values";

export const signalCategorySchema = z.enum(signalCategories);
export const signalScopeKindSchema = z.enum(signalScopes);
export const signalSeveritySchema = z.enum(signalSeverities);
export const signalConfidenceSchema = z.enum(signalConfidences);

const nonEmptyStringSchema = z.string().trim().min(1);
const isoDateTimeSchema = z.string().datetime({ offset: true });
const longitudeSchema = z.number().min(-180).max(180);
const latitudeSchema = z.number().min(-90).max(90);

export const positionSchema = z.tuple([longitudeSchema, latitudeSchema]);

const lineStringCoordinatesSchema = z.array(positionSchema).min(2);
const isClosedRing = (coordinates: readonly [number, number][]): boolean => {
  const first = coordinates[0];
  const last = coordinates.at(-1);

  return first !== undefined && last !== undefined && first[0] === last[0] && first[1] === last[1];
};
const linearRingCoordinatesSchema = z.array(positionSchema).min(4).refine(isClosedRing, {
  message: "Polygon rings must close with the starting position",
});
const polygonCoordinatesSchema = z.array(linearRingCoordinatesSchema).min(1);

export const signalGeometrySchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("LineString"),
      coordinates: lineStringCoordinatesSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("MultiLineString"),
      coordinates: z.array(lineStringCoordinatesSchema).min(1),
    })
    .strict(),
  z
    .object({
      type: z.literal("Polygon"),
      coordinates: polygonCoordinatesSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("MultiPolygon"),
      coordinates: z.array(polygonCoordinatesSchema).min(1),
    })
    .strict(),
]);

export const signalSourceLinkSchema = z
  .object({
    url: z.string().url(),
    label: nonEmptyStringSchema.optional(),
  })
  .strict();

export const signalScopeSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("global"),
    })
    .strict(),
  z
    .object({
      kind: z.literal("region"),
      regionId: regionIdSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("point"),
      coordinates: positionSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("geometry"),
      geometry: signalGeometrySchema,
    })
    .strict(),
]);

export const normalizedSignalSchema = z
  .object({
    provider: nonEmptyStringSchema,
    dedupeKey: nonEmptyStringSchema,
    providerEventId: nonEmptyStringSchema.optional(),
    possibleCrossProviderDuplicateKey: nonEmptyStringSchema.optional(),
    category: signalCategorySchema,
    title: nonEmptyStringSchema,
    severity: signalSeveritySchema,
    confidence: signalConfidenceSchema,
    effectiveAt: isoDateTimeSchema,
    occurredAt: isoDateTimeSchema.optional(),
    issuedAt: isoDateTimeSchema.optional(),
    scope: signalScopeSchema,
    sourceLink: signalSourceLinkSchema.optional(),
  })
  .strict();

export type SignalGeometry = z.infer<typeof signalGeometrySchema>;
export type SignalSourceLink = z.infer<typeof signalSourceLinkSchema>;
export type SignalScope = z.infer<typeof signalScopeSchema>;
export type NormalizedSignal = z.infer<typeof normalizedSignalSchema>;
