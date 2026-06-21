export type RawFetch = {
  url: string;
  data: unknown;
  response: Response;
};

export type JsonFetchResult = {
  data: unknown;
  response: Response;
};

export type JsonFetchWithRaw = {
  data: unknown;
  rawFetches: readonly RawFetch[];
};

export type FetchJsonOptions = {
  fetchFn?: typeof globalThis.fetch;
  timeoutMs?: number;
  errorLabel?: string;
};

const SENSITIVE_QUERY_PARAMS = new Set(["appid", "apiKey", "apikey", "token", "key"]);

function redactUrlForLogs(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    for (const key of SENSITIVE_QUERY_PARAMS) {
      if (parsed.searchParams.has(key)) parsed.searchParams.set(key, "[REDACTED]");
    }
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

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
      const safeUrl = redactUrlForLogs(url);
      const httpError = new Error(
        `${errorLabel} returned ${response.status} ${response.statusText} for ${safeUrl}`,
      );
      Object.assign(httpError, { url: safeUrl, errorLabel, status: response.status });
      throw httpError;
    }
    const data: unknown = await response.json();
    return { data, response };
  } catch (error) {
    if (error instanceof Error) {
      const annotated = error as Error & {
        url?: string;
        errorLabel?: string;
        status?: number;
      };
      if (annotated.url === undefined) annotated.url = redactUrlForLogs(url);
      if (annotated.errorLabel === undefined) annotated.errorLabel = errorLabel;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
