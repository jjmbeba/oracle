import { z } from "zod";
import type {
  NormalizedRejection,
  NormalizedRejectionIssue,
  NormalizedSignal,
  SignalSeverity,
} from "@oracle/domain";
import { createSignalDedupeMetadata } from "@oracle/domain";

const TAG_SEVERITY: Record<string, SignalSeverity> = {
  Tsunami: "extreme",

  Tornado: "severe",
  Hurricane: "severe",
  Cyclone: "severe",
  Typhoon: "severe",
  Extreme: "severe",

  Thunderstorm: "significant",
  Flood: "significant",
  Storm: "significant",
  Blizzard: "significant",
  StormSurge: "significant",

  Wind: "moderate",
  Rain: "moderate",
  Snow: "moderate",
  Ice: "moderate",
  Hail: "moderate",
  Squall: "moderate",
  Lightning: "moderate",
  Avalanche: "moderate",
  Heat: "moderate",
  Cold: "moderate",

  Fog: "minor",
  Drizzle: "minor",
  Dust: "minor",
  Sandstorm: "minor",
  Glaze: "minor",
  Frost: "minor",
  FreezingFog: "minor",
  VolcanicAsh: "minor",
};

const SEVERITY_RANK: Record<SignalSeverity, number> = {
  minor: 0,
  moderate: 1,
  significant: 2,
  severe: 3,
  extreme: 4,
};

const alertIdSchema = z.union([z.number().positive(), z.string().min(1)]);

const openweatherAlertIdExtractionSchema = z.object({ id: z.unknown() }).passthrough();

const openweatherAlertDetailSchema = z
  .object({
    id: alertIdSchema,
    sender_name: z.string(),
    event: z.string(),
    start: z.number().positive(),
    end: z.number().positive(),
    description: z.array(
      z.object({
        locale: z.string().optional(),
        description: z.string().optional(),
      }),
    ),
    tags: z.array(z.string()),
  })
  .strict();

const extractAlertId = (input: unknown): string => {
  const parsed = openweatherAlertIdExtractionSchema.safeParse(input);
  if (!parsed.success) return "unknown";
  return String(parsed.data.id);
};

const formatIssues = (issues: z.ZodIssue[]): NormalizedRejectionIssue[] =>
  issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

export function openweatherTagToSeverity(tags: readonly string[]): SignalSeverity {
  let highest: SignalSeverity = "minor";

  for (const tag of tags) {
    const severity = TAG_SEVERITY[tag];
    if (severity && SEVERITY_RANK[severity] > SEVERITY_RANK[highest]) {
      highest = severity;
    }
  }

  return highest;
}

export function deriveOpenweatherTitle(
  event: string,
  tags: readonly string[],
  description: readonly { locale?: string; description?: string }[],
): string {
  if (event.trim().length > 0) return event.trim();

  if (tags.length > 0) return `${tags.join(", ")} Alert`;

  const withText = description.filter(
    (d) => d.description !== undefined && d.description.trim().length > 0,
  );
  if (withText.length > 0) {
    const enDesc = withText.find((d) => d.locale === "en");
    const preferred = enDesc ?? withText[0]!;
    const truncated = preferred.description!.slice(0, 80).trim();
    if (truncated.length > 0) return truncated;
  }

  return "Weather Alert";
}

export type NormalizeOpenweatherAlertResult = {
  signal: NormalizedSignal | null;
  rejection: NormalizedRejection | null;
};

export function normalizeOpenweatherAlert(
  input: unknown,
  coordinates: [number, number],
): NormalizeOpenweatherAlertResult {
  const providerEventId = extractAlertId(input);

  const parsed = openweatherAlertDetailSchema.safeParse(input);
  if (!parsed.success) {
    return {
      signal: null,
      rejection: {
        providerEventId,
        reason: "schema-validation",
        issues: formatIssues(parsed.error.issues),
      },
    };
  }

  const { id, sender_name, event, start, description, tags } = parsed.data;

  const effectiveAtDate = new Date(start * 1000);
  if (Number.isNaN(effectiveAtDate.getTime())) {
    return {
      signal: null,
      rejection: { providerEventId, reason: "invalid-date" },
    };
  }

  const { dedupeKey } = createSignalDedupeMetadata({
    strategy: "provider-native",
    category: "weather",
    provider: "openweather",
    providerEventId: String(id),
  });

  return {
    signal: {
      provider: "openweather",
      dedupeKey,
      providerEventId: String(id),
      category: "weather",
      title: deriveOpenweatherTitle(event, tags, description),
      severity: openweatherTagToSeverity(tags),
      confidence: "high",
      effectiveAt: effectiveAtDate.toISOString(),
      scope: { kind: "point", coordinates },
      sourceLink: {
        url: "https://openweathermap.org/api/one-call-4",
        label: sender_name || "OpenWeather",
      },
    },
    rejection: null,
  };
}

const openweatherFetchPayloadSchema = z
  .object({
    alerts: z.array(
      z
        .object({
          coordinates: z.tuple([z.number(), z.number()]),
          payload: z.unknown(),
        })
        .passthrough(),
    ),
  })
  .passthrough();

export function normalizeOpenweatherResponse(input: unknown): {
  signals: NormalizedSignal[];
  skipped: NormalizedRejection[];
} {
  const parsed = openweatherFetchPayloadSchema.parse(input);

  const signals: NormalizedSignal[] = [];
  const skipped: NormalizedRejection[] = [];

  for (const entry of parsed.alerts) {
    const { signal, rejection } = normalizeOpenweatherAlert(entry.payload, entry.coordinates);
    if (signal) {
      signals.push(signal);
    }
    if (rejection) {
      skipped.push(rejection);
    }
  }

  return { signals, skipped };
}
