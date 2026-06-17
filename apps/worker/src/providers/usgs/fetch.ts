export const defaultUsgsUrl =
  "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=4&orderby=magnitude&limit=200";

export type UsgsFetchResult = {
  data: unknown;
  response: Response;
};

export async function fetchUsgsSignals(
  fetchFn: typeof globalThis.fetch = globalThis.fetch,
  url = defaultUsgsUrl,
): Promise<UsgsFetchResult> {
  const response = await fetchFn(url);
  if (!response.ok) {
    throw new Error(`USGS API returned ${response.status}: ${response.statusText}`);
  }
  const data: unknown = await response.json();
  return { data, response };
}
