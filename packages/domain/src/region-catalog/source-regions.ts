import type { ContinentId, CountryGroupId } from "./types";

type CountryGroupSourceRecord = {
  readonly id: CountryGroupId;
  readonly displayName: string;
};

type ContinentSourceRecord = {
  readonly id: ContinentId;
  readonly displayName: string;
};

export const countryGroupSourceRecords = [
  { id: "group:northern-africa", displayName: "Northern Africa" },
  { id: "group:eastern-africa", displayName: "Eastern Africa" },
  { id: "group:middle-africa", displayName: "Middle Africa" },
  { id: "group:southern-africa", displayName: "Southern Africa" },
  { id: "group:western-africa", displayName: "Western Africa" },
] as const satisfies readonly CountryGroupSourceRecord[];

export const continentSourceRecords = [
  { id: "continent:africa", displayName: "Africa" },
  { id: "continent:americas", displayName: "Americas" },
  { id: "continent:antarctica", displayName: "Antarctica" },
  { id: "continent:asia", displayName: "Asia" },
  { id: "continent:europe", displayName: "Europe" },
  { id: "continent:oceania", displayName: "Oceania" },
] as const satisfies readonly ContinentSourceRecord[];
