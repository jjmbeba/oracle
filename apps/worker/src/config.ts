export const defaultPlaceholderIntervalMs = 5_000;
export const maxIntervalMs = 2_147_483_647;
export const defaultUsgsPollIntervalMs = 300_000;
export const defaultSwpcPollIntervalMs = 600_000;
export const defaultOpenweatherPollIntervalMs = 600_000;
export const defaultDatabaseUrl = "";

export function parsePlaceholderIntervalMs(
  value: string | undefined,
  fallbackMs = defaultPlaceholderIntervalMs,
): number {
  if (value === undefined) {
    return fallbackMs;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0 || parsedValue > maxIntervalMs) {
    return fallbackMs;
  }

  return parsedValue;
}

export function readPlaceholderIntervalMs(env: NodeJS.ProcessEnv = process.env): number {
  return parsePlaceholderIntervalMs(env.WORKER_PLACEHOLDER_INTERVAL_MS);
}

export function readDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  return (env.DATABASE_URL ?? defaultDatabaseUrl).trim();
}

export function parseUsgsPollIntervalMs(
  value: string | undefined,
  fallbackMs = defaultUsgsPollIntervalMs,
): number {
  if (value === undefined) {
    return fallbackMs;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0 || parsedValue > maxIntervalMs) {
    return fallbackMs;
  }

  return parsedValue;
}

export function readUsgsPollIntervalMs(env: NodeJS.ProcessEnv = process.env): number {
  return parseUsgsPollIntervalMs(env.USGS_POLL_INTERVAL_MS);
}

export function parseSwpcPollIntervalMs(
  value: string | undefined,
  fallbackMs = defaultSwpcPollIntervalMs,
): number {
  if (value === undefined) {
    return fallbackMs;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0 || parsedValue > maxIntervalMs) {
    return fallbackMs;
  }

  return parsedValue;
}

export function readSwpcPollIntervalMs(env: NodeJS.ProcessEnv = process.env): number {
  return parseSwpcPollIntervalMs(env.SWPC_POLL_INTERVAL_MS);
}

export function parseOpenweatherPollIntervalMs(
  value: string | undefined,
  fallbackMs = defaultOpenweatherPollIntervalMs,
): number {
  if (value === undefined) {
    return fallbackMs;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0 || parsedValue > maxIntervalMs) {
    return fallbackMs;
  }

  return parsedValue;
}

export function readOpenweatherPollIntervalMs(env: NodeJS.ProcessEnv = process.env): number {
  return parseOpenweatherPollIntervalMs(env.OPENWEATHER_POLL_INTERVAL_MS);
}

export function readOpenweatherApiKey(env: NodeJS.ProcessEnv = process.env): string {
  return (env.OPENWEATHER_API_KEY ?? "").trim();
}
