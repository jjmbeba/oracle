export {
  continents,
  countries,
  countryById,
  countryGroups,
  getCountryById,
  getRegionById,
  isRegionId,
  regionById,
  regions,
} from "./catalog";
export { getRegionDossier, aggregateMemberFacts } from "./dossier";
export { regionIdSchema } from "./schemas";
export { searchRegions, toRegionSearchResult, type RegionSearchResult } from "./search";
export type {
  Continent,
  ContinentDossier,
  ContinentId,
  Country,
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
