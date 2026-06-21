import type { NormalizedSignal, SignalSeverity } from "../signals";

const SEVERITY_WEIGHT = {
  minor: 5, moderate: 15, significant: 30, severe: 60, extreme: 90,
} as const satisfies Record<SignalSeverity, number>;

export type RiskLevel = "quiet" | "watch" | "elevated" | "high" | "critical";

export type RiskScore = {
  readonly score: number;
  readonly level: RiskLevel;
  readonly worstSeverity: SignalSeverity | null;
  readonly contributingSignals: number;
};

export function scoreSignals(signals: readonly NormalizedSignal[]): RiskScore {
  if (signals.length === 0) {
    return { score: 0, level: "quiet", worstSeverity: null, contributingSignals: 0 };
  }

  const [worst, ...rest] = [...signals].sort(
    (a, b) => SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity],
  );

  const score = Math.min(
    100,
    Math.round(
      SEVERITY_WEIGHT[worst.severity] * 0.7
        + rest.reduce((acc, s, i) => acc + SEVERITY_WEIGHT[s.severity] / (i + 2), 0),
    ),
  );

  return {
    score,
    level:
      score >= 60 ? "critical"
        : score >= 30 ? "high"
          : score >= 10 ? "elevated"
            : score >= 1 ? "watch"
              : "quiet",
    worstSeverity: worst.severity,
    contributingSignals: signals.length,
  };
}
