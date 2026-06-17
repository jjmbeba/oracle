export const SIGNAL_FEED_PATH = "/api/signals/feed";

export type SignalFeedScope =
  | { readonly kind: "global" }
  | { readonly kind: "region"; readonly regionId: string }
  | { readonly kind: "point"; readonly coordinates: readonly [number, number] }
  | { readonly kind: "geometry" };

export type SignalFeedItem = {
  readonly provider: string;
  readonly category: string;
  readonly title: string;
  readonly severity: string;
  readonly confidence: string;
  readonly effectiveAt: string;
  readonly scope: SignalFeedScope;
  readonly sourceLink?: { readonly url: string; readonly label?: string };
};

export type FreshnessEntry = {
  readonly provider: string;
  readonly category: string;
  readonly lastSuccessfulPollAt: string;
};

type SignalFeedResponse = {
  readonly signals: readonly SignalFeedItem[];
  readonly freshness: readonly FreshnessEntry[];
};

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSignalFeedScope(value: unknown): value is SignalFeedScope {
  if (!isRecord(value)) return false;
  if (typeof value.kind !== "string") return false;

  if (value.kind === "global") return true;
  if (value.kind === "region") return typeof value.regionId === "string";
  if (value.kind === "point") {
    return (
      Array.isArray(value.coordinates) &&
      value.coordinates.length === 2 &&
      typeof value.coordinates[0] === "number" &&
      typeof value.coordinates[1] === "number"
    );
  }
  if (value.kind === "geometry") return true;

  return false;
}

function isSignalFeedItem(value: unknown): value is SignalFeedItem {
  if (!isRecord(value)) return false;
  if (
    typeof value.provider !== "string" ||
    typeof value.category !== "string" ||
    typeof value.title !== "string" ||
    typeof value.severity !== "string" ||
    typeof value.confidence !== "string" ||
    typeof value.effectiveAt !== "string"
  ) return false;
  if (!isSignalFeedScope(value.scope)) return false;
  if (value.sourceLink !== undefined) {
    if (!isRecord(value.sourceLink) || typeof value.sourceLink.url !== "string") return false;
  }
  return true;
}

function isFreshnessEntry(value: unknown): value is FreshnessEntry {
  if (!isRecord(value)) return false;
  return (
    typeof value.provider === "string" &&
    typeof value.category === "string" &&
    typeof value.lastSuccessfulPollAt === "string"
  );
}

function isSignalFeedResponse(value: unknown): value is SignalFeedResponse {
  if (!isRecord(value)) return false;
  if (!Array.isArray(value.signals) || !value.signals.every(isSignalFeedItem)) return false;
  if (!Array.isArray(value.freshness) || !value.freshness.every(isFreshnessEntry)) return false;
  return true;
}

export async function fetchSignalFeed(
  category: string,
  fetcher: Fetcher = fetch,
): Promise<SignalFeedResponse> {
  const url = `${SIGNAL_FEED_PATH}?category=${encodeURIComponent(category)}`;
  const response = await fetcher(url);

  if (!response.ok) {
    throw new Error(`Signal feed request failed with status ${response.status}`);
  }

  const body: unknown = await response.json();

  if (!isSignalFeedResponse(body)) {
    throw new Error("Signal feed returned an invalid response");
  }

  return body;
}
