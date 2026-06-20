import { describe, expect, it } from "vitest";
import {
  openweatherTagToSeverity,
  deriveOpenweatherTitle,
  normalizeOpenweatherAlert,
  normalizeOpenweatherResponse,
} from "./normalizer";
import brazilFixture from "./__fixtures__/alert-brazil.json";
import germanyFixture from "./__fixtures__/alert-germany.json";
import usaFixture from "./__fixtures__/alert-usa.json";

const BRAZIL_COORDS: [number, number] = [-47.882778, -15.793889];
const GERMANY_COORDS: [number, number] = [13.405, 52.52];
const USA_COORDS: [number, number] = [-95.7, 37.1];

describe("openweatherTagToSeverity", () => {
  it("maps Tsunami to extreme", () => {
    expect(openweatherTagToSeverity(["Tsunami"])).toBe("extreme");
  });

  it("maps Tornado, Hurricane, Cyclone, Typhoon, Extreme to severe", () => {
    expect(openweatherTagToSeverity(["Tornado"])).toBe("severe");
    expect(openweatherTagToSeverity(["Hurricane"])).toBe("severe");
    expect(openweatherTagToSeverity(["Cyclone"])).toBe("severe");
    expect(openweatherTagToSeverity(["Typhoon"])).toBe("severe");
    expect(openweatherTagToSeverity(["Extreme"])).toBe("severe");
  });

  it("maps Thunderstorm, Flood, Storm, Blizzard, StormSurge to significant", () => {
    expect(openweatherTagToSeverity(["Thunderstorm"])).toBe("significant");
    expect(openweatherTagToSeverity(["Flood"])).toBe("significant");
    expect(openweatherTagToSeverity(["Storm"])).toBe("significant");
    expect(openweatherTagToSeverity(["Blizzard"])).toBe("significant");
    expect(openweatherTagToSeverity(["StormSurge"])).toBe("significant");
  });

  it("maps Wind, Rain, Snow, Ice, Hail, Squall, Lightning, Avalanche, Heat, Cold to moderate", () => {
    expect(openweatherTagToSeverity(["Wind"])).toBe("moderate");
    expect(openweatherTagToSeverity(["Rain"])).toBe("moderate");
    expect(openweatherTagToSeverity(["Snow"])).toBe("moderate");
    expect(openweatherTagToSeverity(["Ice"])).toBe("moderate");
    expect(openweatherTagToSeverity(["Hail"])).toBe("moderate");
    expect(openweatherTagToSeverity(["Squall"])).toBe("moderate");
    expect(openweatherTagToSeverity(["Lightning"])).toBe("moderate");
    expect(openweatherTagToSeverity(["Avalanche"])).toBe("moderate");
    expect(openweatherTagToSeverity(["Heat"])).toBe("moderate");
    expect(openweatherTagToSeverity(["Cold"])).toBe("moderate");
  });

  it("maps Fog, Drizzle, Dust, Sandstorm, Glaze, Frost, FreezingFog, VolcanicAsh to minor", () => {
    expect(openweatherTagToSeverity(["Fog"])).toBe("minor");
    expect(openweatherTagToSeverity(["Drizzle"])).toBe("minor");
    expect(openweatherTagToSeverity(["Dust"])).toBe("minor");
    expect(openweatherTagToSeverity(["Sandstorm"])).toBe("minor");
    expect(openweatherTagToSeverity(["Glaze"])).toBe("minor");
    expect(openweatherTagToSeverity(["Frost"])).toBe("minor");
    expect(openweatherTagToSeverity(["FreezingFog"])).toBe("minor");
    expect(openweatherTagToSeverity(["VolcanicAsh"])).toBe("minor");
  });

  it("maps unknown tags to minor", () => {
    expect(openweatherTagToSeverity(["UnknownTag"])).toBe("minor");
    expect(openweatherTagToSeverity([""])).toBe("minor");
  });

  it("returns highest severity when multiple tags present", () => {
    expect(openweatherTagToSeverity(["Wind", "Thunderstorm", "Flood"])).toBe("significant");
    expect(openweatherTagToSeverity(["Fog", "Wind"])).toBe("moderate");
    expect(openweatherTagToSeverity(["Drizzle", "Tsunami"])).toBe("extreme");
  });

  it("returns minor for empty tags array", () => {
    expect(openweatherTagToSeverity([])).toBe("minor");
  });
});

describe("deriveOpenweatherTitle", () => {
  it("uses event when non-empty", () => {
    expect(deriveOpenweatherTitle("Flood Warning", [], [])).toBe("Flood Warning");
  });

  it("trims whitespace from event", () => {
    expect(deriveOpenweatherTitle("  Wind Advisory  ", [], [])).toBe("Wind Advisory");
  });

  it("derives title from tags when event is blank", () => {
    expect(deriveOpenweatherTitle("", ["Wind"], [])).toBe("Wind Alert");
    expect(deriveOpenweatherTitle("", ["Thunderstorm", "Wind"], [])).toBe(
      "Thunderstorm, Wind Alert",
    );
  });

  it("prefers tags over description when event is blank", () => {
    const desc = [{ locale: "en", description: "Some long weather warning text" }];
    expect(deriveOpenweatherTitle("", ["Wind"], desc)).toBe("Wind Alert");
  });

  it("uses English description when event blank and no tags", () => {
    const desc = [
      { locale: "en", description: "Severe thunderstorm warning in effect until midnight" },
    ];
    expect(deriveOpenweatherTitle("", [], desc)).toBe(
      "Severe thunderstorm warning in effect until midnight",
    );
  });

  it("uses first description when no English available", () => {
    const desc = [{ locale: "pt-BR", description: "Tempestade severa em andamento" }];
    expect(deriveOpenweatherTitle("", [], desc)).toBe("Tempestade severa em andamento");
  });

  it("truncates long description to 80 chars", () => {
    const longDesc =
      "This is a very long weather warning description that should definitely be truncated because it exceeds our eighty character limit for display titles in the signal feed.";
    const desc = [{ locale: "en", description: longDesc }];
    expect(deriveOpenweatherTitle("", [], desc)).toBe(longDesc.slice(0, 80).trim());
  });

  it("returns fallback when event, tags, and description are all empty", () => {
    expect(deriveOpenweatherTitle("", [], [])).toBe("Weather Alert");
  });

  it("returns fallback when description text is whitespace", () => {
    const desc = [{ locale: "en", description: "   " }];
    expect(deriveOpenweatherTitle("", [], desc)).toBe("Weather Alert");
  });
});

describe("normalizeOpenweatherAlert", () => {
  it("normalizes Brazil alert (event blank, pt-BR description, Wind tag)", () => {
    const { signal, rejection } = normalizeOpenweatherAlert(brazilFixture, BRAZIL_COORDS);
    expect(rejection).toBeNull();

    expect(signal).not.toBeNull();

    expect(signal!.provider).toBe("openweather");
    expect(signal!.category).toBe("weather");
    expect(signal!.severity).toBe("moderate");
    expect(signal!.confidence).toBe("high");
    expect(signal!.title).toBe("Wind Alert");
    expect(signal!.scope).toEqual({ kind: "point", coordinates: BRAZIL_COORDS });
    expect(signal!.sourceLink).toEqual({
      url: "https://openweathermap.org/api/one-call-4",
      label: "Instituto Nacional de Meteorologia",
    });
  });

  it("normalizes Germany alert (event blank, en description, Thunderstorm+Wind tags)", () => {
    const { signal, rejection } = normalizeOpenweatherAlert(germanyFixture, GERMANY_COORDS);
    expect(rejection).toBeNull();

    expect(signal).not.toBeNull();

    expect(signal!.provider).toBe("openweather");
    expect(signal!.category).toBe("weather");
    expect(signal!.severity).toBe("significant");
    expect(signal!.title).toBe("Thunderstorm, Wind Alert");
    expect(signal!.scope).toEqual({ kind: "point", coordinates: GERMANY_COORDS });
    expect(signal!.sourceLink).toEqual({
      url: "https://openweathermap.org/api/one-call-4",
      label: "Deutscher Wetterdienst",
    });
  });

  it("normalizes USA alert (non-blank event, Flood tag)", () => {
    const { signal, rejection } = normalizeOpenweatherAlert(usaFixture, USA_COORDS);
    expect(rejection).toBeNull();

    expect(signal).not.toBeNull();

    expect(signal!.provider).toBe("openweather");
    expect(signal!.category).toBe("weather");
    expect(signal!.severity).toBe("significant");
    expect(signal!.title).toBe("Flood Warning");
    expect(signal!.scope).toEqual({ kind: "point", coordinates: USA_COORDS });
    expect(signal!.sourceLink).toEqual({
      url: "https://openweathermap.org/api/one-call-4",
      label: "National Weather Service",
    });
  });

  it("includes timestamps as round-trippable ISO strings", () => {
    const { signal } = normalizeOpenweatherAlert(germanyFixture, GERMANY_COORDS);
    expect(signal).not.toBeNull();
    expect(new Date(signal!.effectiveAt).toISOString()).toBe(signal!.effectiveAt);
  });

  it("uses start epoch seconds for effectiveAt", () => {
    const { signal } = normalizeOpenweatherAlert(germanyFixture, GERMANY_COORDS);
    expect(signal).not.toBeNull();
    const start = (germanyFixture as { start: number }).start;
    expect(signal!.effectiveAt).toBe(new Date(start * 1000).toISOString());
  });

  it("builds correct dedupe key from alert id", () => {
    const { signal } = normalizeOpenweatherAlert(brazilFixture, BRAZIL_COORDS);
    expect(signal).not.toBeNull();
    expect(signal!.dedupeKey).toBe("signal:weather:openweather:provider-native:1234567");
    expect(signal!.providerEventId).toBe("1234567");
  });

  it("returns a rejection for malformed input (missing id)", () => {
    const { id: _, ...rest } = brazilFixture as Record<string, unknown>;
    const { signal, rejection } = normalizeOpenweatherAlert(rest, BRAZIL_COORDS);
    expect(signal).toBeNull();
    expect(rejection).not.toBeNull();
    expect(rejection!.providerEventId).toBe("unknown");
    expect(rejection!.reason).toBe("schema-validation");
    expect(rejection!.issues?.map((i) => i.path)).toContain("id");
  });

  it("returns a rejection for non-object input", () => {
    expect(normalizeOpenweatherAlert("not an object", BRAZIL_COORDS)).toEqual({
      signal: null,
      rejection: expect.objectContaining({ reason: "schema-validation" }),
    });
    expect(normalizeOpenweatherAlert(null, BRAZIL_COORDS)).toEqual({
      signal: null,
      rejection: expect.objectContaining({ reason: "schema-validation" }),
    });
    expect(normalizeOpenweatherAlert(42, BRAZIL_COORDS)).toEqual({
      signal: null,
      rejection: expect.objectContaining({ reason: "schema-validation" }),
    });
  });

  it("returns a rejection with a captured alert id even when full validation fails", () => {
    const { signal, rejection } = normalizeOpenweatherAlert({ id: 1234567 }, BRAZIL_COORDS);
    expect(signal).toBeNull();
    expect(rejection).not.toBeNull();
    expect(rejection!.providerEventId).toBe("1234567");
    expect(rejection!.reason).toBe("schema-validation");
    expect(rejection!.issues?.map((i) => i.path)).toEqual(
      expect.arrayContaining(["sender_name", "event", "start", "end", "description", "tags"]),
    );
  });

  it("returns a rejection for input with missing start", () => {
    const { start: _, ...rest } = brazilFixture as Record<string, unknown>;
    const { signal, rejection } = normalizeOpenweatherAlert(rest, BRAZIL_COORDS);
    expect(signal).toBeNull();
    expect(rejection).not.toBeNull();
    expect(rejection!.reason).toBe("schema-validation");
    expect(rejection!.issues?.map((i) => i.path)).toContain("start");
  });

  it("returns a rejection with reason schema-validation when start is not a number", () => {
    const payload = { ...brazilFixture, start: "not-a-number" };
    const { signal, rejection } = normalizeOpenweatherAlert(payload, BRAZIL_COORDS);
    expect(signal).toBeNull();
    expect(rejection).not.toBeNull();
    expect(rejection!.reason).toBe("schema-validation");
  });

  it("accepts out-of-range coordinates without rejection", () => {
    const { signal, rejection } = normalizeOpenweatherAlert(brazilFixture, [200, 91]);
    expect(rejection).toBeNull();
    expect(signal).not.toBeNull();
    expect(signal!.scope).toEqual({ kind: "point", coordinates: [200, 91] });
  });

  it("accepts description entries where locale is undefined (live OpenWeather shape)", () => {
    const liveShape = {
      id: "VPWW54_JPTK_201820_02_202606201820170_001_38697:14:1311500:0:0:bd980f52b5594645c6a36b4016fdd359",
      sender_name: "Japan Meteorological Agency",
      event: "",
      start: 1750000000,
      end: 1750086400,
      description: [
        {
          description: "Some warning text",
        },
      ],
      tags: ["Wind"],
    };

    const { signal, rejection } = normalizeOpenweatherAlert(liveShape, BRAZIL_COORDS);
    expect(rejection).toBeNull();
    expect(signal).not.toBeNull();
    expect(signal!.providerEventId).toBe(liveShape.id);
    expect(signal!.title).toBe("Wind Alert");
  });

  it("falls back to Weather Alert when all description entries have no text", () => {
    const payload = {
      id: 1234,
      sender_name: "Test",
      event: "",
      start: 1750000000,
      end: 1750086400,
      description: [{ locale: "en" }, { description: "   " }],
      tags: [],
    };

    const { signal, rejection } = normalizeOpenweatherAlert(payload, BRAZIL_COORDS);
    expect(rejection).toBeNull();
    expect(signal).not.toBeNull();
    expect(signal!.title).toBe("Weather Alert");
  });
});

describe("normalizeOpenweatherResponse", () => {
  it("normalizes a payload of fetched alerts with their coordinates", () => {
    const input = {
      alerts: [
        { coordinates: BRAZIL_COORDS, payload: brazilFixture },
        { coordinates: GERMANY_COORDS, payload: germanyFixture },
      ],
    };

    const { signals, skipped } = normalizeOpenweatherResponse(input);

    expect(signals).toHaveLength(2);
    expect(skipped).toHaveLength(0);

    expect(signals[0]!.provider).toBe("openweather");
    expect(signals[0]!.category).toBe("weather");
    expect(signals[0]!.scope).toEqual({ kind: "point", coordinates: BRAZIL_COORDS });
    expect(signals[0]!.title).toBe("Wind Alert");

    expect(signals[1]!.scope).toEqual({ kind: "point", coordinates: GERMANY_COORDS });
    expect(signals[1]!.title).toBe("Thunderstorm, Wind Alert");
  });

  it("throws on non-payload input", () => {
    expect(() => normalizeOpenweatherResponse(null)).toThrow();
    expect(() => normalizeOpenweatherResponse("not an object")).toThrow();
    expect(() => normalizeOpenweatherResponse({ unrelated: true })).toThrow();
  });

  it("captures alert id and issues for entries whose payload fails alert-detail validation", () => {
    const input = {
      alerts: [
        { coordinates: BRAZIL_COORDS, payload: brazilFixture },
        { coordinates: GERMANY_COORDS, payload: { id: "broken" } },
      ],
    };

    const { signals, skipped } = normalizeOpenweatherResponse(input);

    expect(signals).toHaveLength(1);
    expect(signals[0]!.title).toBe("Wind Alert");
    expect(skipped).toHaveLength(1);
    expect(skipped[0]!.providerEventId).toBe("broken");
    expect(skipped[0]!.reason).toBe("schema-validation");
    expect(skipped[0]!.issues?.map((i) => i.path)).toEqual(
      expect.arrayContaining(["sender_name", "event", "start", "end", "description", "tags"]),
    );
  });

  it("returns empty signals when the alerts list is empty", () => {
    const { signals, skipped } = normalizeOpenweatherResponse({ alerts: [] });
    expect(signals).toEqual([]);
    expect(skipped).toEqual([]);
  });
});
