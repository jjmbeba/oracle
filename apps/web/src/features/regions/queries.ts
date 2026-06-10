import { useQuery } from "@tanstack/vue-query";
import type { MaybeRefOrGetter } from "vue";
import { computed, toValue } from "vue";
import { fetchRegionSearch } from "./api";

export const REGION_SEARCH_QUERY_KEY = ["regions", "search"] as const;
export const REGION_SEARCH_STALE_TIME_MS = 5 * 60 * 1000;

export function normalizeRegionSearchQuery(query: string): string {
  return query.trim();
}

export function useRegionSearchQuery(query: MaybeRefOrGetter<string>) {
  const normalizedQuery = computed(() => normalizeRegionSearchQuery(toValue(query)));

  return useQuery({
    queryKey: computed(() => [...REGION_SEARCH_QUERY_KEY, normalizedQuery.value] as const),
    queryFn: () => fetchRegionSearch(normalizedQuery.value),
    staleTime: REGION_SEARCH_STALE_TIME_MS,
    placeholderData: (previousData) => previousData,
  });
}
