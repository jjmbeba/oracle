export const signalCategories = [
  "earthquake",
  "weather",
  "space-weather",
] as const;

export type SignalCategory = (typeof signalCategories)[number];

export const signalCategoryLabels = {
  earthquake: "Earthquake",
  weather: "Weather",
  "space-weather": "Space Weather",
} as const satisfies Record<SignalCategory, string>;

export const signalScopes = ["global", "region", "point", "geometry"] as const;

export type SignalScopeKind = (typeof signalScopes)[number];

export const signalScopeLabels = {
  global: "Global",
  region: "Region",
  point: "Point",
  geometry: "Geometry",
} as const satisfies Record<SignalScopeKind, string>;

export const signalSeverities = [
  "minor",
  "moderate",
  "significant",
  "severe",
  "extreme",
] as const;

export type SignalSeverity = (typeof signalSeverities)[number];

export const signalSeverityLabels = {
  minor: "Minor",
  moderate: "Moderate",
  significant: "Significant",
  severe: "Severe",
  extreme: "Extreme",
} as const satisfies Record<SignalSeverity, string>;

export const signalConfidences = ["high", "medium", "low"] as const;

export type SignalConfidence = (typeof signalConfidences)[number];

export const signalConfidenceLabels = {
  high: "High",
  medium: "Medium",
  low: "Low",
} as const satisfies Record<SignalConfidence, string>;
