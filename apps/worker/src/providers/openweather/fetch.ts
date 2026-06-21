import { z } from "zod";
import { fetchJson, type JsonFetchWithRaw, type RawFetch } from "../fetch-json";

export type OpenweatherCoordinate = { lat: number; lon: number };

export type OpenweatherFetchedAlert = {
  coordinates: [number, number];
  payload: unknown;
};

export type OpenweatherFetchPayload = {
  alerts: OpenweatherFetchedAlert[];
};

const defaultBaseUrl = "https://api.openweathermap.org/data/4.0/onecall";

export const defaultOpenweatherProbeCoordinates: readonly OpenweatherCoordinate[] = [
  { lat: -1.286389, lon: 36.817223 },
  { lat: 35.6764, lon: 139.65 },
  { lat: -15.793889, lon: -47.882778 },
  { lat: 52.52, lon: 13.405 },
];

const currentResponseSchema = z
  .object({
    data: z
      .array(
        z
          .object({
            alerts: z.array(z.string()).optional(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough();

function extractAlertIds(currentResponse: unknown): string[] {
  const parsed = currentResponseSchema.safeParse(currentResponse);
  if (!parsed.success) return [];

  const ids = new Set<string>();
  for (const entry of parsed.data.data ?? []) {
    for (const alertId of entry.alerts ?? []) {
      ids.add(alertId);
    }
  }
  return [...ids];
}

function coordinatesToLngLat(coord: OpenweatherCoordinate): [number, number] {
  return [coord.lon, coord.lat];
}

function buildCurrentUrl(baseUrl: string, coord: OpenweatherCoordinate, apiKey: string): string {
  const url = new URL(`${baseUrl}/current`);
  url.searchParams.set("lat", String(coord.lat));
  url.searchParams.set("lon", String(coord.lon));
  url.searchParams.set("appid", apiKey);
  return url.toString();
}

function buildAlertUrl(baseUrl: string, alertId: string, apiKey: string): string {
  const url = new URL(`${baseUrl}/alert/${encodeURIComponent(alertId)}`);
  url.searchParams.set("appid", apiKey);
  return url.toString();
}

export type FetchOpenweatherAlertsOptions = {
  fetchFn?: typeof globalThis.fetch;
  baseUrl?: string;
  coordinates?: readonly OpenweatherCoordinate[];
  apiKey: string;
  timeoutMs?: number;
};

export async function fetchOpenweatherAlerts(
  options: FetchOpenweatherAlertsOptions,
): Promise<JsonFetchWithRaw> {
  const fetchFn = options.fetchFn ?? globalThis.fetch;
  const baseUrl = options.baseUrl ?? defaultBaseUrl;
  const coordinates = options.coordinates ?? defaultOpenweatherProbeCoordinates;
  const timeoutMs = options.timeoutMs ?? 30_000;
  const errorLabel = "OpenWeather API";

  const seen = new Set<string>();
  const fetchedAlerts: OpenweatherFetchedAlert[] = [];
  const rawFetches: RawFetch[] = [];

  for (const coord of coordinates) {
    const currentUrl = buildCurrentUrl(baseUrl, coord, options.apiKey);
    const currentResult = await fetchJson(currentUrl, { fetchFn, timeoutMs, errorLabel });
    rawFetches.push({ url: currentUrl, data: currentResult.data, response: currentResult.response });

    const alertIds = extractAlertIds(currentResult.data);
    const lngLat = coordinatesToLngLat(coord);

    for (const alertId of alertIds) {
      if (seen.has(alertId)) continue;
      seen.add(alertId);

      const alertUrl = buildAlertUrl(baseUrl, alertId, options.apiKey);
      const alertResult = await fetchJson(alertUrl, { fetchFn, timeoutMs, errorLabel });
      rawFetches.push({ url: alertUrl, data: alertResult.data, response: alertResult.response });

      fetchedAlerts.push({
        coordinates: lngLat,
        payload: alertResult.data,
      });
    }
  }

  const payload: OpenweatherFetchPayload = { alerts: fetchedAlerts };

  return { data: payload, rawFetches };
}
