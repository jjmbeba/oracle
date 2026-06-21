import { fetchJson, type JsonFetchWithRaw } from "../fetch-json";

export const defaultSwpcUrl = "https://services.swpc.noaa.gov/products/alerts.json";

export type SwpcFetchResult = JsonFetchWithRaw;

export async function fetchSwpcAlerts(
  fetchFn?: typeof globalThis.fetch,
  url = defaultSwpcUrl,
  timeoutMs = 30_000,
): Promise<SwpcFetchResult> {
  const result = await fetchJson(url, { fetchFn, timeoutMs, errorLabel: "SWPC API" });
  return {
    data: result.data,
    rawFetches: [{ url, data: result.data, response: result.response }],
  };
}
