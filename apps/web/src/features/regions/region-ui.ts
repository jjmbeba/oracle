import type { RegionSearchResult, CountryDossierFacts, GroupDossierFacts } from "./api";

export function getRegionKindLabel(region: RegionSearchResult): string {
  if (region.kind === "country") {
    return "Country";
  }

  if (region.kind === "country-group") {
    return "Country group";
  }

  return "Continent";
}

export function getRegionMetaLabel(region: RegionSearchResult): string {
  if (region.kind === "country") {
    return region.alpha2;
  }

  const noun = region.memberCount === 1 ? "country" : "countries";

  return `${region.memberCount} ${noun}`;
}

export function isRegionSelected(
  region: RegionSearchResult,
  selectedRegion: RegionSearchResult | null,
): boolean {
  return selectedRegion?.id === region.id;
}

export function formatPopulation(value: number | null): string | null {
  if (value === null) return null;
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

export function formatCoordinate(value: number | null, axis: "lat" | "lng"): string | null {
  if (value === null) return null;
  const dir = axis === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  return `${Math.abs(value).toFixed(2)}°${dir}`;
}

export function formatGdp(value: number | null): string | null {
  if (value === null) return null;
  return `$${value.toLocaleString("en-US")}`;
}

export type FactRow = {
  label: string;
  value: string;
};

type FactDef<T> = {
  label: string;
  get: (facts: T) => string | null;
};

function buildRows<T>(facts: T, defs: FactDef<T>[]): FactRow[] {
  const rows: FactRow[] = [];
  for (const d of defs) {
    const value = d.get(facts);
    if (value !== null) rows.push({ label: d.label, value });
  }
  return rows;
}

const COUNTRY_FACTS: FactDef<CountryDossierFacts>[] = [
  { label: "Capital", get: f => f.capital },
  { label: "Population", get: f => formatPopulation(f.population) },
  { label: "Languages", get: f => f.languages?.join(", ") ?? null },
  { label: "Currencies", get: f => f.currencies?.join(", ") ?? null },
  { label: "Coordinates", get: f =>
      f.latitude !== null && f.longitude !== null
        ? `${formatCoordinate(f.latitude, "lat")}, ${formatCoordinate(f.longitude, "lng")}`
        : null },
  { label: "Flag", get: f => f.flagEmoji },
  { label: "GDP per capita", get: f => formatGdp(f.gdpPerCapita) },
  { label: "Pop. density", get: f => f.populationDensity !== null ? `${f.populationDensity}/km²` : null },
];

const GROUP_FACTS: FactDef<GroupDossierFacts>[] = [
  { label: "Population", get: f => formatPopulation(f.population) },
  { label: "Languages", get: f => f.languages.length > 0 ? f.languages.join(", ") : null },
  { label: "Currencies", get: f => f.currencies.length > 0 ? f.currencies.join(", ") : null },
  { label: "GDP per capita (avg)", get: f => formatGdp(f.gdpPerCapita) },
  { label: "Pop. density (avg)", get: f => f.populationDensity !== null ? `${f.populationDensity}/km²` : null },
];

export function buildOverviewFactRows(
  facts: CountryDossierFacts | GroupDossierFacts,
  kind: "country" | "country-group" | "continent",
): FactRow[] {
  return kind === "country"
    ? buildRows(facts as CountryDossierFacts, COUNTRY_FACTS)
    : buildRows(facts as GroupDossierFacts, GROUP_FACTS);
}
