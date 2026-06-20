import { describe, expect, it } from "vitest";
import {
  openweatherTagToSeverity,
  deriveOpenweatherTitle,
  normalizeOpenweatherAlert,
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
    const signal = normalizeOpenweatherAlert(brazilFixture, BRAZIL_COORDS);
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
    const signal = normalizeOpenweatherAlert(germanyFixture, GERMANY_COORDS);
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
    const signal = normalizeOpenweatherAlert(usaFixture, USA_COORDS);
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
    const signal = normalizeOpenweatherAlert(germanyFixture, GERMANY_COORDS);
    expect(signal).not.toBeNull();
    expect(new Date(signal!.effectiveAt).toISOString()).toBe(signal!.effectiveAt);
  });

  it("uses start epoch seconds for effectiveAt", () => {
    const signal = normalizeOpenweatherAlert(germanyFixture, GERMANY_COORDS);
    expect(signal).not.toBeNull();
    const start = (germanyFixture as { start: number }).start;
    expect(signal!.effectiveAt).toBe(new Date(start * 1000).toISOString());
  });

  it("builds correct dedupe key from alert id", () => {
    const signal = normalizeOpenweatherAlert(brazilFixture, BRAZIL_COORDS);
    expect(signal).not.toBeNull();
    expect(signal!.dedupeKey).toBe("signal:weather:openweather:provider-native:1234567");
    expect(signal!.providerEventId).toBe("1234567");
  });

  it("returns null for malformed input (missing id)", () => {
    const { id: _, ...rest } = brazilFixture as Record<string, unknown>;
    expect(normalizeOpenweatherAlert(rest, BRAZIL_COORDS)).toBeNull();
  });

  it("returns null for non-object input", () => {
    expect(normalizeOpenweatherAlert("not an object", BRAZIL_COORDS)).toBeNull();
    expect(normalizeOpenweatherAlert(null, BRAZIL_COORDS)).toBeNull();
    expect(normalizeOpenweatherAlert(42, BRAZIL_COORDS)).toBeNull();
  });

  it("returns null for input with missing start", () => {
    const { start: _, ...rest } = brazilFixture as Record<string, unknown>;
    expect(normalizeOpenweatherAlert(rest, BRAZIL_COORDS)).toBeNull();
  });

  it("returns null for invalid coordinates", () => {
    const signal = normalizeOpenweatherAlert(brazilFixture, [200, 91]);
    expect(signal).not.toBeNull();
    expect(signal!.scope).toEqual({ kind: "point", coordinates: [200, 91] });
  });
});
