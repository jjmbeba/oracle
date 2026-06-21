import { describe, expect, it } from "vitest";
import { diffSnapshots, type ChangeReportEntry } from "./diff";

function entry(
  overrides: Partial<ChangeReportEntry> & { dedupeKey: string },
): ChangeReportEntry {
  return {
    severity: "moderate",
    category: "earthquake",
    occurredAt: null,
    ...overrides,
  };
}

describe("diffSnapshots", () => {
  it("returns all current signals as new when no previous snapshot", () => {
    const result = diffSnapshots([], [entry({ dedupeKey: "a" }), entry({ dedupeKey: "b" })], null, {
      score: 10,
      level: "watch",
    });

    expect(result.newSignals).toHaveLength(2);
    expect(result.expiredSignals).toHaveLength(0);
    expect(result.severityChanges).toHaveLength(0);
    expect(result.riskMovement).toBeNull();
  });

  it("returns empty diff when nothing changed", () => {
    const signals = [entry({ dedupeKey: "a" })];
    const result = diffSnapshots(signals, signals, { score: 10, level: "watch" }, { score: 10, level: "watch" });

    expect(result.newSignals).toHaveLength(0);
    expect(result.expiredSignals).toHaveLength(0);
    expect(result.severityChanges).toHaveLength(0);
    expect(result.riskMovement).toBeNull();
  });

  it("detects new signals", () => {
    const result = diffSnapshots(
      [entry({ dedupeKey: "a" })],
      [entry({ dedupeKey: "a" }), entry({ dedupeKey: "b" })],
      null,
      { score: 10, level: "watch" },
    );

    expect(result.newSignals).toHaveLength(1);
    expect(result.newSignals[0].dedupeKey).toBe("b");
  });

  it("detects expired signals", () => {
    const result = diffSnapshots(
      [entry({ dedupeKey: "a" }), entry({ dedupeKey: "b" })],
      [entry({ dedupeKey: "a" })],
      null,
      { score: 10, level: "watch" },
    );

    expect(result.expiredSignals).toHaveLength(1);
    expect(result.expiredSignals[0].dedupeKey).toBe("b");
  });

  it("detects severity changes", () => {
    const result = diffSnapshots(
      [entry({ dedupeKey: "a", severity: "minor" })],
      [entry({ dedupeKey: "a", severity: "severe" })],
      null,
      { score: 10, level: "watch" },
    );

    expect(result.severityChanges).toHaveLength(1);
    expect(result.severityChanges[0].dedupeKey).toBe("a");
    expect(result.severityChanges[0].fromSeverity).toBe("minor");
    expect(result.severityChanges[0].severity).toBe("severe");
  });

  it("reports risk movement on level change", () => {
    const result = diffSnapshots([], [], { score: 10, level: "watch" }, { score: 60, level: "critical" });

    expect(result.riskMovement).toEqual({
      fromScore: 10,
      toScore: 60,
      fromLevel: "watch",
      toLevel: "critical",
    });
  });

  it("reports risk movement on score change >= 10", () => {
    const result = diffSnapshots([], [], { score: 0, level: "quiet" }, { score: 10, level: "quiet" });

    expect(result.riskMovement).toEqual({
      fromScore: 0,
      toScore: 10,
      fromLevel: "quiet",
      toLevel: "quiet",
    });
  });

  it("does not report risk movement on small score drift < 10", () => {
    const result = diffSnapshots([], [], { score: 5, level: "watch" }, { score: 7, level: "watch" });

    expect(result.riskMovement).toBeNull();
  });

  it("handles multiple categories and severities together", () => {
    const prev = [
      entry({ dedupeKey: "eq1", severity: "moderate", category: "earthquake" }),
      entry({ dedupeKey: "w1", severity: "minor", category: "weather" }),
    ];
    const current = [
      entry({ dedupeKey: "eq1", severity: "severe", category: "earthquake" }),
      entry({ dedupeKey: "sw1", severity: "minor", category: "space-weather" }),
    ];

    const result = diffSnapshots(prev, current, { score: 15, level: "elevated" }, { score: 60, level: "critical" });

    expect(result.newSignals).toHaveLength(1);
    expect(result.newSignals[0].dedupeKey).toBe("sw1");

    expect(result.expiredSignals).toHaveLength(1);
    expect(result.expiredSignals[0].dedupeKey).toBe("w1");

    expect(result.severityChanges).toHaveLength(1);
    expect(result.severityChanges[0].dedupeKey).toBe("eq1");
    expect(result.severityChanges[0].fromSeverity).toBe("moderate");
    expect(result.severityChanges[0].severity).toBe("severe");

    expect(result.riskMovement).toEqual({
      fromScore: 15,
      toScore: 60,
      fromLevel: "elevated",
      toLevel: "critical",
    });
  });
});
