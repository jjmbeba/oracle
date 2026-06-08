export const defaultPlaceholderIntervalMs = 5_000;
export const maxIntervalMs = 2_147_483_647;

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
