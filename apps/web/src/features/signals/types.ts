import type { SignalFeedItem } from "./api";

export const SEVERITY_STYLES = {
  minor:        { radius: 4,  opacity: 0.4,  color: "#6b8fa3",  pulse: false, label: "Minor" },
  moderate:     { radius: 6,  opacity: 0.55, color: "#7aaa6b",  pulse: false, label: "Moderate" },
  significant:  { radius: 9,  opacity: 0.7,  color: "#d4b04a",  pulse: false, label: "Significant" },
  severe:       { radius: 13, opacity: 0.85, color: "#d48040",  pulse: true,  label: "Severe" },
  extreme:      { radius: 18, opacity: 1.0,  color: "#c05050",  pulse: true,  label: "Extreme" },
} as const;

export type SignalSeverity = keyof typeof SEVERITY_STYLES;

export const SEVERITY_ORDER: Record<SignalSeverity, number> = {
  extreme: 0,
  severe: 1,
  significant: 2,
  moderate: 3,
  minor: 4,
};

export const SIGNAL_CATEGORIES = ["earthquake", "weather", "space-weather"] as const;

export type SignalCategory = (typeof SIGNAL_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<SignalCategory, string> = {
  earthquake: "Earthquake",
  weather: "Weather",
  "space-weather": "Space Weather",
};

export const isSignalSeverity = (value: unknown): value is SignalSeverity =>
  typeof value === "string" &&
  Object.prototype.hasOwnProperty.call(SEVERITY_STYLES, value);

export const isSignalCategory = (value: unknown): value is SignalCategory =>
  typeof value === "string" && (SIGNAL_CATEGORIES as readonly string[]).includes(value);

export type SignalGeoJsonFeature = {
  type: "Feature";
  id: string;
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    provider: string;
    category: SignalCategory;
    title: string;
    severity: SignalSeverity;
    confidence: string;
    effectiveAt: string;
    sourceLinkUrl?: string;
    sourceLinkLabel?: string;
  };
};

export type SignalGeoJsonCollection = {
  type: "FeatureCollection";
  features: SignalGeoJsonFeature[];
};

export function signalFeedToGeoJson(
  signals: readonly SignalFeedItem[],
): SignalGeoJsonCollection {
  const features: SignalGeoJsonFeature[] = [];

  for (const s of signals) {
    if (s.scope.kind !== "point") continue;
    if (!isSignalCategory(s.category)) continue;
    if (!isSignalSeverity(s.severity)) continue;

    const [lng, lat] = s.scope.coordinates;

    features.push({
      type: "Feature",
      id: `${s.provider}-${s.effectiveAt}-${lng}-${lat}`,
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: {
        provider: s.provider,
        category: s.category,
        title: s.title,
        severity: s.severity,
        confidence: s.confidence,
        effectiveAt: s.effectiveAt,
        sourceLinkUrl: s.sourceLink?.url,
        sourceLinkLabel: s.sourceLink?.label,
      },
    });
  }

  return { type: "FeatureCollection", features };
}
