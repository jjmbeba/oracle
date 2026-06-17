import type { RegionSearchResult } from "../regions/api";

export const WATCHED_REGIONS_PATH = "/api/watched-regions";

export type WatchedRegion = {
  readonly id: string;
  readonly regionId: string;
  readonly region: RegionSearchResult | null;
  readonly createdAt: string;
};

type WatchedRegionsResponse = {
  readonly watchedRegions: readonly WatchedRegion[];
};

type WatchRegionResponse = {
  readonly watchedRegion: WatchedRegion;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isRegionSearchResult(value: unknown): value is RegionSearchResult {
  if (!isRecord(value)) return false;
  if (
    typeof value.id !== "string" ||
    typeof value.displayName !== "string" ||
    typeof value.kind !== "string"
  ) return false;

  if (value.kind === "country") return typeof value.alpha2 === "string";
  if (value.kind === "country-group" || value.kind === "continent") {
    return (
      isStringArray(value.memberCountryIds) &&
      typeof value.memberCount === "number" &&
      Number.isInteger(value.memberCount)
    );
  }

  return false;
}

function isWatchedRegion(value: unknown): value is WatchedRegion {
  if (!isRecord(value)) return false;
  if (
    typeof value.id !== "string" ||
    typeof value.regionId !== "string" ||
    typeof value.createdAt !== "string"
  ) return false;
  if (value.region !== null && !isRegionSearchResult(value.region)) return false;
  return true;
}

function isWatchedRegionsResponse(value: unknown): value is WatchedRegionsResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.watchedRegions) &&
    value.watchedRegions.every(isWatchedRegion)
  );
}

function isWatchRegionResponse(value: unknown): value is WatchRegionResponse {
  return isRecord(value) && isWatchedRegion(value.watchedRegion);
}

function getErrorMessage(body: unknown): string {
  if (isRecord(body) && isRecord(body.error) && typeof body.error.message === "string") {
    return body.error.message;
  }
  return "Request failed";
}

async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, { ...init, credentials: "include" });
}

export async function fetchWatchedRegions(
  fetcher: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> = apiFetch,
): Promise<readonly WatchedRegion[]> {
  const response = await fetcher(WATCHED_REGIONS_PATH);

  if (!response.ok) {
    throw new Error(`Failed to fetch watched regions: ${response.status}`);
  }

  const body: unknown = await response.json();

  if (!isWatchedRegionsResponse(body)) {
    throw new Error("Watched regions returned an invalid response");
  }

  return body.watchedRegions;
}

export async function watchRegion(
  regionId: string,
  fetcher: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> = apiFetch,
): Promise<WatchedRegion> {
  const response = await fetcher(WATCHED_REGIONS_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ regionId }),
  });

  const body: unknown = await response.json();

  if (!response.ok) {
    throw new Error(getErrorMessage(body));
  }

  if (!isWatchRegionResponse(body)) {
    throw new Error("Watch region returned an invalid response");
  }

  return body.watchedRegion;
}

export async function unwatchRegion(
  regionId: string,
  fetcher: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> = apiFetch,
): Promise<void> {
  const response = await fetcher(
    `${WATCHED_REGIONS_PATH}/${encodeURIComponent(regionId)}`,
    { method: "DELETE" },
  );

  if (!response.ok) {
    const body: unknown = await safeJson(response);
    throw new Error(getErrorMessage(body));
  }
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
