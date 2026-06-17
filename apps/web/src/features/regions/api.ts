export const REGION_SEARCH_PATH = "/api/regions/search";

export type CountryRegionSearchResult = {
  readonly id: string;
  readonly kind: "country";
  readonly displayName: string;
  readonly alpha2: string;
};

export type GroupRegionSearchResult = {
  readonly id: string;
  readonly kind: "country-group" | "continent";
  readonly displayName: string;
  readonly memberCountryIds: readonly string[];
  readonly memberCount: number;
};

export type RegionSearchResult = CountryRegionSearchResult | GroupRegionSearchResult;

type RegionSearchResponse = {
  readonly regions: readonly RegionSearchResult[];
};

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isRegionSearchResult(value: unknown): value is RegionSearchResult {
  if (!isRecord(value)) {
    return false;
  }

  if (
    typeof value.id !== "string" ||
    typeof value.displayName !== "string" ||
    typeof value.kind !== "string"
  ) {
    return false;
  }

  if (value.kind === "country") {
    return typeof value.alpha2 === "string";
  }

  if (value.kind === "country-group" || value.kind === "continent") {
    return isStringArray(value.memberCountryIds) && typeof value.memberCount === "number" && Number.isInteger(value.memberCount) && value.memberCount >= 0;
  }

  return false;
}

function isRegionSearchResponse(value: unknown): value is RegionSearchResponse {
  return (
    isRecord(value) && Array.isArray(value.regions) && value.regions.every(isRegionSearchResult)
  );
}

function buildRegionSearchUrl(query?: string): string {
  const normalizedQuery = query?.trim() ?? "";

  if (normalizedQuery.length === 0) {
    return REGION_SEARCH_PATH;
  }

  return `${REGION_SEARCH_PATH}?q=${encodeURIComponent(normalizedQuery)}`;
}

export async function fetchRegionSearch(
  query?: string,
  fetcher: Fetcher = fetch,
): Promise<readonly RegionSearchResult[]> {
  const response = await fetcher(buildRegionSearchUrl(query));

  if (!response.ok) {
    throw new Error(`Region search failed with status ${response.status}`);
  }

  const body: unknown = await response.json();

  if (!isRegionSearchResponse(body)) {
    throw new Error("Region search returned an invalid response");
  }

  return body.regions;
}

// ── Dossier types ──

export type FactSource = {
  readonly label: string;
  readonly url?: string;
};

export type CountryDossierFacts = {
  readonly capital: string | null;
  readonly population: number | null;
  readonly languages: readonly string[] | null;
  readonly currencies: readonly string[] | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly flagEmoji: string | null;
  readonly gdpPerCapita: number | null;
  readonly populationDensity: number | null;
};

export type GroupDossierFacts = {
  readonly population: number | null;
  readonly languages: readonly string[];
  readonly currencies: readonly string[];
  readonly gdpPerCapita: number | null;
  readonly populationDensity: number | null;
};

export type CountryDossierResponse = {
  readonly region: {
    readonly kind: "country";
    readonly id: string;
    readonly displayName: string;
    readonly alpha2: string;
  };
  readonly overviewFacts: CountryDossierFacts | null;
  readonly factSources: readonly FactSource[];
};

export type GroupDossierResponse = {
  readonly region: {
    readonly kind: "country-group" | "continent";
    readonly id: string;
    readonly displayName: string;
    readonly memberCount: number;
  };
  readonly overviewFacts: GroupDossierFacts | null;
  readonly factSources: readonly FactSource[];
};

export type DossierResponse = CountryDossierResponse | GroupDossierResponse;

type DossierApiResponse = {
  readonly dossier: DossierResponse;
};

function isFactSource(value: unknown): value is FactSource {
  return (
    isRecord(value) &&
    typeof value.label === "string" &&
    (value.url === undefined || typeof value.url === "string")
  );
}

function isCountryDossierFacts(value: unknown): value is CountryDossierFacts {
  if (!isRecord(value)) return false;
  return (
    (value.capital === null || typeof value.capital === "string") &&
    (value.population === null || typeof value.population === "number") &&
    (value.languages === null || isStringArray(value.languages)) &&
    (value.currencies === null || isStringArray(value.currencies)) &&
    (value.latitude === null || typeof value.latitude === "number") &&
    (value.longitude === null || typeof value.longitude === "number") &&
    (value.flagEmoji === null || typeof value.flagEmoji === "string") &&
    (value.gdpPerCapita === null || typeof value.gdpPerCapita === "number") &&
    (value.populationDensity === null || typeof value.populationDensity === "number")
  );
}

function isGroupDossierFacts(value: unknown): value is GroupDossierFacts {
  if (!isRecord(value)) return false;
  return (
    (value.population === null || typeof value.population === "number") &&
    isStringArray(value.languages) &&
    isStringArray(value.currencies) &&
    (value.gdpPerCapita === null || typeof value.gdpPerCapita === "number") &&
    (value.populationDensity === null || typeof value.populationDensity === "number")
  );
}

function isDossierResponse(value: unknown): value is DossierResponse {
  if (!isRecord(value)) return false;
  const region = value.region;
  if (!isRecord(region)) return false;
  if (typeof region.kind !== "string") return false;

  const hasSources = Array.isArray(value.factSources) && value.factSources.every(isFactSource);
  if (!hasSources) return false;

  if (region.kind === "country") {
    return (
      typeof region.id === "string" &&
      typeof region.displayName === "string" &&
      typeof region.alpha2 === "string" &&
      (value.overviewFacts === null || isCountryDossierFacts(value.overviewFacts))
    );
  }

  if (region.kind === "country-group" || region.kind === "continent") {
    return (
      typeof region.id === "string" &&
      typeof region.displayName === "string" &&
      typeof region.memberCount === "number" &&
      Number.isInteger(region.memberCount) &&
      region.memberCount >= 0 &&
      (value.overviewFacts === null || isGroupDossierFacts(value.overviewFacts))
    );
  }

  return false;
}

function isDossierApiResponse(value: unknown): value is DossierApiResponse {
  return isRecord(value) && isDossierResponse(value.dossier);
}

export async function fetchRegionDossier(
  regionId: string,
  fetcher: Fetcher = fetch,
): Promise<DossierResponse> {
  const response = await fetcher(`/api/regions/${encodeURIComponent(regionId)}/dossier`);

  if (!response.ok) {
    throw new Error(`Region dossier request failed with status ${response.status}`);
  }

  const body: unknown = await response.json();

  if (!isDossierApiResponse(body)) {
    throw new Error("Region dossier returned an invalid response");
  }

  return body.dossier;
}
