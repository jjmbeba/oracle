export const defaultUsgsUrl =
  "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=4&orderby=magnitude&limit=200";

export type UsgsFetchResult = {
  data: unknown;
  response: Response;
};

export async function fetchUsgsSignals(
  fetchFn: typeof globalThis.fetch = globalThis.fetch,
  url = defaultUsgsUrl,
  timeoutMs = 30_000,
): Promise<UsgsFetchResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchFn(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`USGS API returned ${response.status}: ${response.statusText}`);
    }
    const data: unknown = await response.json();
    return { data, response };
  } finally {
    clearTimeout(timeout);
  }
}
