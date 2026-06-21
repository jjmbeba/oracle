import { describe, expect, it } from "vitest";
import { scoreSignals } from "./scoring";
import type { NormalizedSignal } from "../signals/schemas";

function makeSignal(severity: NormalizedSignal["severity"]): NormalizedSignal {
  return {
    provider: "test",
    dedupeKey: `sig:${severity}:${Math.random()}`,
    category: "earthquake",
    title: "Test",
    severity,
    confidence: "medium",
    effectiveAt: new Date().toISOString(),
    scope: { kind: "global" },
  };
}

function sig(severity: NormalizedSignal["severity"]): NormalizedSignal {
  return makeSignal(severity);
}

describe("scoreSignals", () => {
  it("returns quiet for empty signals", () => {
    const r = scoreSignals([]);
    expect(r.score).toBe(0);
    expect(r.level).toBe("quiet");
    expect(r.worstSeverity).toBeNull();
    expect(r.contributingSignals).toBe(0);
  });

  it("maps a single minor signal to watch", () => {
    const r = scoreSignals([sig("minor")]);
    expect(r.score).toBeGreaterThanOrEqual(1);
    expect(r.score).toBeLessThan(10);
    expect(r.level).toBe("watch");
    expect(r.worstSeverity).toBe("minor");
    expect(r.contributingSignals).toBe(1);
  });

  it("maps a single severe signal to high", () => {
    const r = scoreSignals([sig("severe")]);
    expect(r.score).toBeGreaterThanOrEqual(30);
    expect(r.score).toBeLessThan(60);
    expect(r.level).toBe("high");
    expect(r.worstSeverity).toBe("severe");
  });

  it("maps a single extreme signal to critical", () => {
    const r = scoreSignals([sig("extreme")]);
    expect(r.score).toBeGreaterThanOrEqual(60);
    expect(r.level).toBe("critical");
    expect(r.worstSeverity).toBe("extreme");
  });

  it("keeps score above the worst-signal floor when adding minor signals", () => {
    const extreme = scoreSignals([sig("extreme")]);
    const extremePlusMinors = scoreSignals([sig("extreme"), sig("minor"), sig("minor"), sig("minor")]);
    expect(extremePlusMinors.score).toBeGreaterThanOrEqual(extreme.score);
  });

  it("applies diminishing returns for additional signals", () => {
    const single = scoreSignals([sig("moderate")]);
    const triple = scoreSignals([sig("moderate"), sig("moderate"), sig("moderate")]);
    expect(triple.score).toBeLessThan(single.score * 3);
  });

  it("uses only PRD-glossary risk level labels", () => {
    const expected = new Set(["quiet", "watch", "elevated", "high", "critical"]);
    const severities: NormalizedSignal["severity"][] = [
      "minor", "moderate", "significant", "severe", "extreme",
    ];
    for (const s of severities) {
      expect(expected.has(scoreSignals([sig(s)]).level)).toBe(true);
    }
  });

  it("excludes space-weather signals from the score", () => {
    const quake = sig("severe");
    const solar: NormalizedSignal = { ...sig("extreme"), category: "space-weather" };
    const r = scoreSignals([quake, solar]);
    expect(r.score).toBeGreaterThanOrEqual(30);
    expect(r.score).toBeLessThan(60);
    expect(r.contributingSignals).toBe(1);
  });

  it("returns quiet when only space-weather signals are present", () => {
    const r = scoreSignals([{ ...sig("extreme"), category: "space-weather" }]);
    expect(r.score).toBe(0);
    expect(r.level).toBe("quiet");
    expect(r.worstSeverity).toBeNull();
    expect(r.contributingSignals).toBe(0);
  });
});
