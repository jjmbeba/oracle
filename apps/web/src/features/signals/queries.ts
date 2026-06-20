import { useQueries } from "@tanstack/vue-query";
import { computed, type Ref } from "vue";
import { fetchSignalFeed } from "./api";
import { isSignalCategory } from "./types";
import type { SignalCategory } from "./types";
import type { SignalFeedItem, FreshnessEntry } from "./api";

export const SIGNAL_FEED_QUERY_KEY = ["signals", "feed"] as const;
export const SIGNAL_FEED_STALE_TIME_MS = 5 * 60 * 1000;

export type SignalFeedResult = {
  readonly signals: readonly SignalFeedItem[];
  readonly freshness: readonly FreshnessEntry[];
};

export type SignalFeedQueries = {
  readonly results: Readonly<Ref<ReadonlyArray<{ readonly data: SignalFeedResult | undefined; readonly isLoading: boolean }>>>;
  readonly allSignals: Ref<readonly SignalFeedItem[]>;
  readonly isLoadingAny: Ref<boolean>;
};

export function useSignalFeedQueries(
  categories: Ref<readonly SignalCategory[]>,
): SignalFeedQueries {
  const validCategories = computed(() => categories.value.filter(isSignalCategory));

  const queries = computed(() =>
    validCategories.value.map((category) => ({
      queryKey: [...SIGNAL_FEED_QUERY_KEY, category] as const,
      queryFn: () => fetchSignalFeed(category),
      staleTime: SIGNAL_FEED_STALE_TIME_MS,
    })),
  );

  const results = useQueries({ queries });

  const allSignals = computed<readonly SignalFeedItem[]>(() =>
    results.value.flatMap((r) => r.data?.signals ?? []),
  );

  const isLoadingAny = computed(() => results.value.some((r) => r.isLoading));

  return { results, allSignals, isLoadingAny };
}
