import { fetchJson, type JsonFetchResult } from "../fetch-json";

export const defaultSwpcUrl = "https://services.swpc.noaa.gov/products/alerts.json";

export type SwpcFetchResult = JsonFetchResult;

export function fetchSwpcAlerts(
  fetchFn?: typeof globalThis.fetch,
  url = defaultSwpcUrl,
  timeoutMs = 30_000,
): Promise<SwpcFetchResult> {
  return fetchJson(url, { fetchFn, timeoutMs, errorLabel: "SWPC API" });
}
