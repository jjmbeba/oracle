export const defaultPlaceholderIntervalMs = 5_000;

export function parsePlaceholderIntervalMs(
  value: string | undefined,
  fallbackMs = defaultPlaceholderIntervalMs,
): number {
  if (value === undefined) {
    return fallbackMs;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return fallbackMs;
  }

  return parsedValue;
}

export function readPlaceholderIntervalMs(env: NodeJS.ProcessEnv = process.env): number {
  return parsePlaceholderIntervalMs(env.WORKER_PLACEHOLDER_INTERVAL_MS);
}
