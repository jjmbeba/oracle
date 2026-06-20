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
      const httpError = new Error(
        `${errorLabel} returned ${response.status} ${response.statusText} for ${url}`,
      );
      Object.assign(httpError, { url, errorLabel, status: response.status });
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
      if (annotated.url === undefined) annotated.url = url;
      if (annotated.errorLabel === undefined) annotated.errorLabel = errorLabel;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
