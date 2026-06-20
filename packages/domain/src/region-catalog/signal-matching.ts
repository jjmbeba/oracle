import { getCountryById } from "./catalog";
import type { CountryBounds } from "./types";
import type { NormalizedSignal } from "../signals/schemas";
import type { CountryId } from "./types";

const pointInBounds = (lng: number, lat: number, bounds: CountryBounds): boolean =>
  lng >= bounds.west && lng <= bounds.east && lat >= bounds.south && lat <= bounds.north;

const pointMatchesRegion = (
  lng: number,
  lat: number,
  memberCountryIds: readonly CountryId[],
): boolean => {
  for (const id of memberCountryIds) {
    const country = getCountryById(id);
    if (!country?.bounds) continue;
    if (pointInBounds(lng, lat, country.bounds)) return true;
  }
  return false;
};

export const matchSignalsToRegion = (
  signals: readonly NormalizedSignal[],
  memberCountryIds: readonly CountryId[],
): readonly NormalizedSignal[] => {
  const memberSet = new Set<string>(memberCountryIds);

  return signals.filter((signal) => {
    switch (signal.scope.kind) {
      case "region":
        return memberSet.has(signal.scope.regionId);
      case "global":
        return true;
      case "point":
        return pointMatchesRegion(
          signal.scope.coordinates[0],
          signal.scope.coordinates[1],
          memberCountryIds,
        );
      case "geometry":
        return true;
    }
  });
};
