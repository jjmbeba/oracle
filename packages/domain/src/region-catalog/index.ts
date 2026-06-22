export {
  continents,
  countries,
  countryById,
  countryGroups,
  getCountryById,
  getRegionMemberCountryIds,
  getRegionById,
  isRegionId,
  regionById,
  regions,
} from "./catalog";
export { getRegionDossier, aggregateMemberFacts } from "./dossier";
export { matchSignalsToRegion } from "./signal-matching";
export { factSourceSchema, regionDossierSchema, regionIdSchema, regionSearchResultSchema } from "./schemas";
export { searchRegions, toRegionSearchResult, type RegionSearchResult } from "./search";
export type {
  Continent,
  ContinentDossier,
  ContinentId,
  Country,
  CountryBounds,
  CountryDossier,
  CountryGroup,
  CountryGroupId,
  CountryId,
  CountryOverviewFacts,
  FactSource,
  GroupDossier,
  GroupOverviewFacts,
  Region,
  RegionDossier,
  RegionId,
  RegionKind,
} from "./types";
