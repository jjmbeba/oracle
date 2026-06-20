import { fetchJson, type JsonFetchResult } from "../fetch-json";

export const defaultUsgsUrl =
  "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=4&orderby=magnitude&limit=200";

export type UsgsFetchResult = JsonFetchResult;

export function fetchUsgsSignals(
  fetchFn?: typeof globalThis.fetch,
  url = defaultUsgsUrl,
  timeoutMs = 30_000,
): Promise<UsgsFetchResult> {
  return fetchJson(url, { fetchFn, timeoutMs, errorLabel: "USGS API" });
}
