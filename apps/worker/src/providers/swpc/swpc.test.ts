import { describe, expect, it } from "vitest";
import { normalizeSwpcResponse } from "./normalizer";
import fixture from "./__fixtures__/alerts.json";

describe("normalizeSwpcResponse", () => {
  it("returns normalized signals for valid alerts", () => {
    const { signals, skipped } = normalizeSwpcResponse(fixture);

    expect(signals).toHaveLength(12);
    expect(skipped).toHaveLength(0);

    const first = signals[0]!;
    expect(first.provider).toBe("noaa-swpc");
    expect(first.category).toBe("space-weather");
    expect(first.confidence).toBe("high");
    expect(first.scope).toEqual({ kind: "global" });
  });

  it("maps severity from message code suffix", () => {
    const { signals } = normalizeSwpcResponse(fixture);
    expect(signals.map((s) => ({ id: s.providerEventId, severity: s.severity }))).toEqual([
      { id: "K04A", severity: "minor" },
      { id: "K05A", severity: "minor" },
      { id: "K06A", severity: "moderate" },
      { id: "K07W", severity: "significant" },
      { id: "XM5A", severity: "moderate" },
      { id: "XX0S", severity: "significant" },
      { id: "P11A", severity: "minor" },
      { id: "EF3A", severity: "moderate" },
      { id: "A30F", severity: "moderate" },
      { id: "TIIA", severity: "minor" },
      { id: "MSIS", severity: "minor" },
      { id: "K05W", severity: "minor" },
    ]);
  });

  it("builds correct dedupe keys", () => {
    const { signals } = normalizeSwpcResponse(fixture);

    const alts = signals.filter((s) => s.providerEventId !== "TIIA");
    for (const signal of alts) {
      expect(signal.dedupeKey).toMatch(
        /^signal:space-weather:noaa-swpc:provider-derived:/,
      );
    }

    expect(signals[0]!.dedupeKey).toBe(
      "signal:space-weather:noaa-swpc:provider-derived:altk04+%2F+2666",
    );
    expect(signals[2]!.dedupeKey).toBe(
      "signal:space-weather:noaa-swpc:provider-derived:altk06+%2F+718",
    );
    expect(signals[3]!.dedupeKey).toBe(
      "signal:space-weather:noaa-swpc:provider-derived:wark07+%2F+150",
    );
  });

  it("includes providerEventId from product_id", () => {
    const { signals } = normalizeSwpcResponse(fixture);
    expect(signals[0]!.providerEventId).toBe("K04A");
    expect(signals[1]!.providerEventId).toBe("K05A");
    expect(signals[4]!.providerEventId).toBe("XM5A");
    expect(signals[8]!.providerEventId).toBe("A30F");
  });

  it("extracts titles from message text", () => {
    const { signals } = normalizeSwpcResponse(fixture);
    expect(signals[0]!.title).toBe("ALERT: Geomagnetic K-index of 4");
    expect(signals[3]!.title).toBe("WARNING: Geomagnetic K-index of 7 or greater expected");
    expect(signals[7]!.title).toBe("CONTINUED ALERT: Electron 2MeV Integral Flux exceeded 1000pfu");
    expect(signals[9]!.title).toBe("ALERT: Type II Radio Emission");
    expect(signals[10]!.title).toBe("SUMMARY: Geomagnetic Sudden Impulse");
  });

  it("includes timestamps as round-trippable ISO strings", () => {
    const { signals } = normalizeSwpcResponse(fixture);
    for (const signal of signals) {
      expect(new Date(signal.effectiveAt).toISOString()).toBe(signal.effectiveAt);
      expect(new Date(signal.issuedAt!).toISOString()).toBe(signal.issuedAt);
    }
  });

  it("includes source link on every signal", () => {
    const { signals } = normalizeSwpcResponse(fixture);
    for (const signal of signals) {
      expect(signal.sourceLink).toEqual({
        url: "https://www.swpc.noaa.gov/products/alerts-watches-and-warnings",
        label: "NOAA SWPC Alert",
      });
    }
  });

  it("skips malformed records and reports them in skipped", () => {
    const { signals, skipped } = normalizeSwpcResponse([
      {
        product_id: "good",
        issue_datetime: "2026-06-05 16:39:02.210",
        message:
          "Space Weather Message Code: ALTK06\r\nSerial Number: 718\r\nIssue Time: 2026 Jun 05 1639 UTC\r\n\r\nALERT: Geomagnetic K-index of 6",
      },
      {
        product_id: "bad-no-code",
        issue_datetime: "2026-06-05 16:39:02.210",
        message: "Some random text without the expected format",
      },
      {
        product_id: "bad-no-title",
        issue_datetime: "2026-06-05 16:39:02.210",
        message:
          "Space Weather Message Code: ALTK06\r\nSerial Number: 719\r\nIssue Time: 2026 Jun 05 1639 UTC",
      },
    ]);

    expect(signals).toHaveLength(1);
    expect(signals[0]!.providerEventId).toBe("good");
    expect(skipped).toEqual([
      { productId: "bad-no-code" },
      { productId: "bad-no-title" },
    ]);
  });

  it("skips schema-invalid items (missing product_id) without crashing", () => {
    const { signals, skipped } = normalizeSwpcResponse([
      {
        product_id: "valid",
        issue_datetime: "2026-06-05 16:39:02.210",
        message:
          "Space Weather Message Code: ALTK06\r\nSerial Number: 718\r\nIssue Time: 2026 Jun 05 1639 UTC\r\n\r\nALERT: Geomagnetic K-index of 6",
      },
      {
        issue_datetime: "2026-06-05 17:00:00.000",
        message: "Missing product_id",
      },
    ]);

    expect(signals).toHaveLength(1);
    expect(signals[0]!.providerEventId).toBe("valid");
    expect(skipped).toEqual([{ productId: "unknown" }]);
  });

  it("skips items with malformed timestamps", () => {
    const { signals, skipped } = normalizeSwpcResponse([
      {
        product_id: "good",
        issue_datetime: "2026-06-05 16:39:02.210",
        message:
          "Space Weather Message Code: ALTK06\r\nSerial Number: 718\r\nIssue Time: 2026 Jun 05 1639 UTC\r\n\r\nALERT: Geomagnetic K-index of 6",
      },
      {
        product_id: "bad-date",
        issue_datetime: "not-a-valid-date",
        message:
          "Space Weather Message Code: ALTK06\r\nSerial Number: 719\r\nIssue Time: 2026 Jun 05 1639 UTC\r\n\r\nALERT: Geomagnetic K-index of 6",
      },
    ]);

    expect(signals).toHaveLength(1);
    expect(signals[0]!.providerEventId).toBe("good");
    expect(skipped).toEqual([{ productId: "bad-date" }]);
  });

  it("throws on non-array input", () => {
    expect(() => normalizeSwpcResponse({ not: "an array" })).toThrow();
  });

  it("returns empty signals and skipped for empty array", () => {
    const { signals, skipped } = normalizeSwpcResponse([]);
    expect(signals).toEqual([]);
    expect(skipped).toEqual([]);
  });

  it("handles messages with only \\n line endings", () => {
    const { signals } = normalizeSwpcResponse([
      {
        product_id: "LF",
        issue_datetime: "2026-06-05 16:39:02.210",
        message:
          "Space Weather Message Code: ALTK06\nSerial Number: 9999\nIssue Time: 2026 Jun 05 1639 UTC\n\nALERT: Only LF endings",
      },
    ]);

    expect(signals).toHaveLength(1);
    expect(signals[0]!.providerEventId).toBe("LF");
    expect(signals[0]!.title).toBe("ALERT: Only LF endings");
    expect(signals[0]!.severity).toBe("moderate");
  });
});
