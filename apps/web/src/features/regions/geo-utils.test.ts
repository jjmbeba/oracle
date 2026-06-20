import { describe, expect, it } from "vitest";
import { estimateBounds, findNearestCountry, pointToBounds } from "./geo-utils";

describe("findNearestCountry", () => {
  it("finds Kenya for coordinates near Nairobi", () => {
    const result = findNearestCountry(-1.29, 36.82);
    expect(result).not.toBeNull();
    expect(result!.alpha2).toBe("KE");
    expect(result!.displayName).toBe("Kenya");
  });

  it("finds Japan for coordinates near Tokyo", () => {
    const result = findNearestCountry(35.68, 139.69);
    expect(result).not.toBeNull();
    expect(result!.alpha2).toBe("JP");
  });

  it("finds United States for coordinates near Kansas", () => {
    const result = findNearestCountry(38, -97);
    expect(result).not.toBeNull();
    expect(result!.alpha2).toBe("US");
  });

  it("finds Australia for coordinates in the outback", () => {
    const result = findNearestCountry(-25, 134);
    expect(result).not.toBeNull();
    expect(result!.alpha2).toBe("AU");
  });

  it("returns null for coordinates in the middle of the Pacific Ocean", () => {
    const result = findNearestCountry(0, -150);
    expect(result).toBeNull();
  });

  it("returns null for coordinates in the Southern Ocean", () => {
    const result = findNearestCountry(-70, -120);
    expect(result).toBeNull();
  });
});

describe("estimateBounds", () => {
  it("returns reasonable bounds for a large country like Russia", () => {
    const result = estimateBounds({
      latitude: 61.52,
      longitude: 105.32,
      population: 143_000_000,
      populationDensity: 9,
    });
    const [[west, south], [east, north]] = result;
    expect(east - west).toBeGreaterThan(15);
    expect(east - west).toBeLessThan(45);
    expect(north - south).toBeGreaterThan(15);
    expect(north - south).toBeLessThan(45);
  });

  it("returns tight bounds for a dense city-state like Singapore", () => {
    const result = estimateBounds({
      latitude: 1.35,
      longitude: 103.82,
      population: 5_600_000,
      populationDensity: 7_800,
    });
    const [[west, south], [east, north]] = result;
    expect(east - west).toBeLessThan(5);
    expect(north - south).toBeLessThan(5);
  });

  it("clamps latitude to [-90, 90]", () => {
    const result = estimateBounds({
      latitude: 85,
      longitude: 0,
      population: 100,
      populationDensity: 1,
    });
    const [[, south], [, north]] = result;
    expect(south).toBeGreaterThanOrEqual(-90);
    expect(north).toBeLessThanOrEqual(90);
  });

  it("uses fallback radius of 2 degrees when density is null", () => {
    const result = estimateBounds({
      latitude: 0,
      longitude: 0,
      population: null,
      populationDensity: null,
    });
    const [[west, south], [east, north]] = result;
    expect(east - west).toBeCloseTo(4);
    expect(north - south).toBeCloseTo(4);
  });

  it("uses fallback radius of 2 degrees when density is 0", () => {
    const result = estimateBounds({
      latitude: 0,
      longitude: 0,
      population: 100,
      populationDensity: 0,
    });
    const [[west, south], [east, north]] = result;
    expect(east - west).toBeCloseTo(4);
    expect(north - south).toBeCloseTo(4);
  });

  it("returns the full world when both coordinates are null", () => {
    const [[west, south], [east, north]] = estimateBounds({
      latitude: null,
      longitude: null,
      population: null,
      populationDensity: null,
    });
    expect(west).toBe(-180);
    expect(east).toBe(180);
    expect(south).toBe(-85);
    expect(north).toBe(85);
  });
});

describe("pointToBounds", () => {
  it("returns a 1-degree box centered on the point", () => {
    const [[west, south], [east, north]] = pointToBounds(10, 20);
    expect(west).toBe(9.5);
    expect(east).toBe(10.5);
    expect(south).toBe(19.5);
    expect(north).toBe(20.5);
  });

  it("clamps latitude to [-90, 90] near the north pole", () => {
    const [[, south], [, north]] = pointToBounds(0, 89.8);
    expect(south).toBeLessThanOrEqual(90);
    expect(north).toBeLessThanOrEqual(90);
  });

  it("clamps latitude to [-90, 90] near the south pole", () => {
    const [[, south], [, north]] = pointToBounds(0, -89.8);
    expect(south).toBeGreaterThanOrEqual(-90);
    expect(north).toBeGreaterThanOrEqual(-90);
  });
});
