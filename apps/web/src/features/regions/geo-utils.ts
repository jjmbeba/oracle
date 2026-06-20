import { countries } from "@oracle/domain";

const NEAREST_MAX_KM = 1000;
const KM_PER_DEGREE = 111;

const haversineDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export type CountryMatch = {
  readonly id: string;
  readonly alpha2: string;
  readonly displayName: string;
};

export type OverviewFactsForBounds = {
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly population: number | null;
  readonly populationDensity: number | null;
};

export type LngLatBounds = readonly [readonly [number, number], readonly [number, number]];

export function pointToBounds(lng: number, lat: number): LngLatBounds {
  const deg = 0.5;
  const south = Math.max(-90, lat - deg);
  const north = Math.min(90, lat + deg);
  return [
    [lng - deg, south],
    [lng + deg, north],
  ];
}

export function estimateBounds(facts: OverviewFactsForBounds): LngLatBounds {
  const { latitude, longitude, population, populationDensity } = facts;

  if (latitude === null || longitude === null) {
    return [
      [-180, -85],
      [180, 85],
    ];
  }

  let radiusDeg: number;

  if (population !== null && populationDensity !== null && populationDensity > 0) {
    const areaKm2 = population / populationDensity;
    const radiusKm = Math.sqrt(areaKm2 / Math.PI);
    radiusDeg = radiusKm / KM_PER_DEGREE;
  } else {
    radiusDeg = 2;
  }

  const clampedRadius = Math.max(0.5, Math.min(radiusDeg, 30));
  const south = Math.max(latitude - clampedRadius, -90);
  const north = Math.min(latitude + clampedRadius, 90);

  return [
    [longitude - clampedRadius, south],
    [longitude + clampedRadius, north],
  ];
}

export function findNearestCountry(lat: number, lng: number): CountryMatch | null {
  let nearest: CountryMatch | null = null;
  let minDist = Number.POSITIVE_INFINITY;

  for (const country of countries) {
    if (country.latitude === null || country.longitude === null) continue;

    const dist = haversineDistanceKm(lat, lng, country.latitude, country.longitude);

    if (dist < minDist) {
      minDist = dist;
      nearest = {
        id: country.id,
        alpha2: country.alpha2,
        displayName: country.displayName,
      };
    }
  }

  if (nearest && minDist > NEAREST_MAX_KM) return null;

  return nearest;
}
