import { z } from "zod";
import type { NormalizedSignal, SignalSeverity } from "@oracle/domain";
import { createSignalDedupeMetadata } from "@oracle/domain";

const usgsPropertiesSchema = z.object({
  mag: z.number().nullable().optional(),
  place: z.string(),
  time: z.number().refine((ms) => Number.isFinite(new Date(ms).getTime()), {
    error: "Invalid epoch milliseconds for properties.time",
  }),
  updated: z.number().refine((ms) => Number.isFinite(new Date(ms).getTime()), {
    error: "Invalid epoch milliseconds for properties.updated",
  }),
  url: z.string(),
}).strict();

const usgsFeatureSchema = z.object({
  type: z.literal("Feature"),
  id: z.string(),
  geometry: z.object({
    type: z.literal("Point"),
    coordinates: z.tuple([z.number(), z.number()]).rest(z.number()),
  }).nullable(),
  properties: usgsPropertiesSchema,
}).strict();

const usgsResponseSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(z.unknown()),
});

export function usgsMagnitudeToSeverity(mag: number | null | undefined): SignalSeverity {
  if (mag == null) return "minor";
  if (mag >= 7) return "extreme";
  if (mag >= 6) return "severe";
  if (mag >= 5) return "significant";
  if (mag >= 4) return "moderate";
  return "minor";
}

function normalizeUsgsFeature(feature: unknown): NormalizedSignal | null {
  const parsed = usgsFeatureSchema.safeParse(feature);
  if (!parsed.success) return null;

  const { properties: p, geometry: g, id } = parsed.data;
  const mag = p.mag ?? null;

  const scope: NormalizedSignal["scope"] = g
    ? { kind: "point", coordinates: [g.coordinates[0], g.coordinates[1]] }
    : { kind: "global" };

  const { dedupeKey, providerEventId } = createSignalDedupeMetadata({
    strategy: "provider-native",
    category: "earthquake",
    provider: "usgs",
    providerEventId: id,
  });

  return {
    provider: "usgs",
    dedupeKey,
    providerEventId,
    category: "earthquake",
    title: p.place,
    severity: usgsMagnitudeToSeverity(mag),
    confidence: "high",
    effectiveAt: new Date(p.time).toISOString(),
    occurredAt: new Date(p.time).toISOString(),
    issuedAt: new Date(p.updated).toISOString(),
    scope,
    sourceLink: { url: p.url, label: "USGS Earthquake Page" },
  };
}

export function normalizeUsgsResponse(
  input: unknown,
): { signals: NormalizedSignal[]; skipped: { id: string }[] } {
  const { features } = usgsResponseSchema.parse(input);
  const signals: NormalizedSignal[] = [];
  const skipped: { id: string }[] = [];

  for (const feature of features) {
    const signal = normalizeUsgsFeature(feature);
    if (signal) {
      signals.push(signal);
    } else {
      const raw =
        feature != null && typeof feature === "object"
          ? (feature as Record<string, unknown>)
          : null;
      skipped.push({ id: raw !== null && typeof raw.id === "string" ? raw.id : "unknown" });
    }
  }

  return { signals, skipped };
}
