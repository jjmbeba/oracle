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
    return isStringArray(value.memberCountryIds) && typeof value.memberCount === "number";
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
