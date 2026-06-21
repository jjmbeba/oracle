import type { SignalFeedItem } from "./api";

export const SIGNAL_STROKE_DARK = "#0a0a0a";
export const SIGNAL_STROKE_LIGHT = "#ffffff";
export const SIGNAL_HALO_BASE_OPACITY = 0.75;

export const SEVERITY_STYLES = {
  minor: {
    radius: 5,
    opacity: 0.55,
    color: "#7da4b8",
    haloScale: 1,
    strokeColor: SIGNAL_STROKE_DARK,
    strokeOpacity: 0.35,
    strokeWidth: 0.5,
    pulse: false,
    label: "Minor",
  },
  moderate: {
    radius: 7,
    opacity: 0.7,
    color: "#8bbf7a",
    haloScale: 1,
    strokeColor: SIGNAL_STROKE_DARK,
    strokeOpacity: 0.35,
    strokeWidth: 0.5,
    pulse: false,
    label: "Moderate",
  },
  significant: {
    radius: 10,
    opacity: 0.8,
    color: "#e0c05a",
    haloScale: 1,
    strokeColor: SIGNAL_STROKE_DARK,
    strokeOpacity: 0.35,
    strokeWidth: 0.5,
    pulse: false,
    label: "Significant",
  },
  severe: {
    radius: 13,
    opacity: 0.85,
    color: "#c0683a",
    haloScale: 1.45,
    strokeColor: SIGNAL_STROKE_LIGHT,
    strokeOpacity: 0.25,
    strokeWidth: 1,
    pulse: true,
    label: "Severe",
  },
  extreme: {
    radius: 18,
    opacity: 1.0,
    color: "#b04848",
    haloScale: 1.7,
    strokeColor: SIGNAL_STROKE_LIGHT,
    strokeOpacity: 0.25,
    strokeWidth: 1,
    pulse: true,
    label: "Extreme",
  },
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
  typeof value === "string" && Object.prototype.hasOwnProperty.call(SEVERITY_STYLES, value);

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

export function severityColor(severity: SignalSeverity): string {
  return SEVERITY_STYLES[severity].color;
}

export function signalFeedToGeoJson(signals: readonly SignalFeedItem[]): SignalGeoJsonCollection {
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
