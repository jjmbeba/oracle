import { getRegionById } from "./catalog";
import { countryFactRecords } from "./source-country-facts";
import type {
  ContinentDossier,
  CountryDossier,
  CountryId,
  CountryOverviewFacts,
  FactSource,
  GroupDossier,
  GroupOverviewFacts,
  RegionDossier,
} from "./types";
import type { RegionId } from "./types";

const COMMON_SOURCES: readonly FactSource[] = [
  { label: "UN Statistics 2024", url: "https://unstats.un.org" },
  { label: "World Bank 2024", url: "https://worldbank.org" },
];

const factsByAlpha2 = new Map<string, CountryOverviewFacts>();

for (const record of countryFactRecords) {
  const [alpha2, capital, population, languages, currencies, lat, lng, flagEmoji, gdp, density] =
    record;

  const parseList = (raw: string | null): string[] | null =>
    raw === null ? null : raw.split(", ").map((s) => s.trim()).filter(Boolean);

  factsByAlpha2.set(alpha2, {
    capital,
    population,
    languages: parseList(languages),
    currencies: parseList(currencies),
    latitude: lat,
    longitude: lng,
    flagEmoji,
    gdpPerCapita: gdp,
    populationDensity: density,
  });
}

const getCountryFacts = (alpha2: string): CountryOverviewFacts | null =>
  factsByAlpha2.get(alpha2) ?? null;

const alpha2FromId = (id: CountryId): string => {
  const match = id.match(/^country:([a-z]{2})$/);
  return match ? match[1].toUpperCase() : "";
};

const safeNumberSum = (values: (number | null)[]): number | null => {
  const valid = values.filter((v): v is number => v !== null);
  return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) : null;
};

const safeNumberAvg = (values: (number | null)[]): number | null => {
  const valid = values.filter((v): v is number => v !== null);
  return valid.length > 0
    ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 100) / 100
    : null;
};

const collectUnique = (values: (readonly string[] | null)[]): readonly string[] => {
  const seen = new Set<string>();
  for (const list of values) {
    if (list) {
      for (const item of list) {
        seen.add(item);
      }
    }
  }
  return [...seen];
};

export const aggregateMemberFacts = (
  memberCountryIds: readonly CountryId[],
): GroupOverviewFacts | null => {
  const facts: CountryOverviewFacts[] = [];

  for (const id of memberCountryIds) {
    const alpha2 = alpha2FromId(id);
    if (!alpha2) continue;
    const f = getCountryFacts(alpha2);
    if (f) facts.push(f);
  }

  if (facts.length === 0) return null;

  return {
    population: safeNumberSum(facts.map((f) => f.population)),
    languages: collectUnique(facts.map((f) => f.languages)),
    currencies: collectUnique(facts.map((f) => f.currencies)),
    gdpPerCapita: safeNumberAvg(facts.map((f) => f.gdpPerCapita)),
    populationDensity: safeNumberAvg(facts.map((f) => f.populationDensity)),
  };
};

export const getRegionDossier = (regionId: RegionId): RegionDossier | null => {
  const region = getRegionById(regionId);
  if (!region) return null;

  if (region.kind === "country") {
    const alpha2 = region.alpha2;
    const facts = getCountryFacts(alpha2);

    const result: CountryDossier = {
      region: {
        kind: "country",
        id: region.id,
        displayName: region.displayName,
        alpha2: region.alpha2,
      },
      overviewFacts: facts,
      factSources: COMMON_SOURCES,
    };

    return result;
  }

  if (region.kind === "country-group") {
    const facts = aggregateMemberFacts(region.memberCountryIds);

    const result: GroupDossier = {
      region: {
        kind: "country-group",
        id: region.id,
        displayName: region.displayName,
        memberCount: region.memberCountryIds.length,
      },
      overviewFacts: facts,
      factSources: COMMON_SOURCES,
    };

    return result;
  }

  const facts = aggregateMemberFacts(region.memberCountryIds);

  const result: ContinentDossier = {
    region: {
      kind: "continent",
      id: region.id,
      displayName: region.displayName,
      memberCount: region.memberCountryIds.length,
    },
    overviewFacts: facts,
    factSources: COMMON_SOURCES,
  };

  return result;
};
