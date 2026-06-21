import type { SignalCategory, SignalSeverity } from "../signals";
import type { RiskLevel } from "../risk/scoring";

export type ChangeReportEntry = {
  readonly dedupeKey: string;
  readonly severity: SignalSeverity;
  readonly category: SignalCategory;
  readonly occurredAt: string | null;
};

export type SeverityChangeEntry = ChangeReportEntry & {
  readonly fromSeverity: SignalSeverity;
};

export type RiskMovement = {
  readonly fromScore: number;
  readonly toScore: number;
  readonly fromLevel: RiskLevel;
  readonly toLevel: RiskLevel;
};

export type ChangeReport = {
  readonly newSignals: ChangeReportEntry[];
  readonly expiredSignals: ChangeReportEntry[];
  readonly severityChanges: SeverityChangeEntry[];
  readonly riskMovement: RiskMovement | null;
};

export function diffSnapshots(
  prev: readonly ChangeReportEntry[],
  current: readonly ChangeReportEntry[],
  prevRisk: { readonly score: number; readonly level: RiskLevel } | null,
  currentRisk: { readonly score: number; readonly level: RiskLevel },
): ChangeReport {
  const prevMap = new Map<string, ChangeReportEntry>();
  for (const entry of prev) {
    prevMap.set(entry.dedupeKey, entry);
  }

  const currentMap = new Map<string, ChangeReportEntry>();
  for (const entry of current) {
    currentMap.set(entry.dedupeKey, entry);
  }

  const newSignals: ChangeReportEntry[] = [];
  const expiredSignals: ChangeReportEntry[] = [];
  const severityChanges: SeverityChangeEntry[] = [];

  for (const [key, entry] of currentMap) {
    if (!prevMap.has(key)) {
      newSignals.push(entry);
    } else {
      const prevEntry = prevMap.get(key)!;
      if (prevEntry.severity !== entry.severity) {
        severityChanges.push({ ...entry, fromSeverity: prevEntry.severity });
      }
    }
  }

  for (const [key, entry] of prevMap) {
    if (!currentMap.has(key)) {
      expiredSignals.push(entry);
    }
  }

  let riskMovement: RiskMovement | null = null;
  if (prevRisk !== null) {
    const levelChanged = prevRisk.level !== currentRisk.level;
    const scoreDelta = Math.abs(currentRisk.score - prevRisk.score);
    if (levelChanged || scoreDelta >= 10) {
      riskMovement = {
        fromScore: prevRisk.score,
        toScore: currentRisk.score,
        fromLevel: prevRisk.level,
        toLevel: currentRisk.level,
      };
    }
  }

  return { newSignals, expiredSignals, severityChanges, riskMovement };
}
