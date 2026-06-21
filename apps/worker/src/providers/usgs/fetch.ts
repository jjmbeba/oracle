import { fetchJson, type JsonFetchWithRaw } from "../fetch-json";

export const defaultUsgsUrl =
  "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=4&orderby=magnitude&limit=200";

export type UsgsFetchResult = JsonFetchWithRaw;

export async function fetchUsgsSignals(
  fetchFn?: typeof globalThis.fetch,
  url = defaultUsgsUrl,
  timeoutMs = 30_000,
): Promise<UsgsFetchResult> {
  const result = await fetchJson(url, { fetchFn, timeoutMs, errorLabel: "USGS API" });
  return {
    data: result.data,
    rawFetches: [{ url, data: result.data, response: result.response }],
  };
}
