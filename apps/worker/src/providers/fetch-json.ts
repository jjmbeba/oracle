export type JsonFetchResult = {
  data: unknown;
  response: Response;
};

export type FetchJsonOptions = {
  fetchFn?: typeof globalThis.fetch;
  timeoutMs?: number;
  errorLabel?: string;
};

const defaultTimeoutMs = 30_000;
const defaultErrorLabel = "API";

export async function fetchJson(
  url: string,
  options: FetchJsonOptions = {},
): Promise<JsonFetchResult> {
  const fetchFn = options.fetchFn ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? defaultTimeoutMs;
  const errorLabel = options.errorLabel ?? defaultErrorLabel;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchFn(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`${errorLabel} returned ${response.status}: ${response.statusText}`);
    }
    const data: unknown = await response.json();
    return { data, response };
  } finally {
    clearTimeout(timeout);
  }
}
