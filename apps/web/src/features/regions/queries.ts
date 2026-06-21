import { useQuery } from "@tanstack/vue-query";
import type { MaybeRefOrGetter, Ref } from "vue";
import { computed, toValue } from "vue";
import { fetchRegionActiveSignals, fetchRegionDossier, fetchRegionSearch } from "./api";

export const REGION_SEARCH_QUERY_KEY = ["regions", "search"] as const;
export const REGION_SEARCH_STALE_TIME_MS = 5 * 60 * 1000;

export function useRegionSearchQuery(query: MaybeRefOrGetter<string>) {
  const normalizedQuery = computed(() => toValue(query).trim());

  return useQuery({
    queryKey: computed(() => [...REGION_SEARCH_QUERY_KEY, normalizedQuery.value] as const),
    queryFn: ({ queryKey }) => fetchRegionSearch(queryKey[queryKey.length - 1] as string),
    staleTime: REGION_SEARCH_STALE_TIME_MS,
    placeholderData: (previousData) => previousData,
  });
}

export const REGION_DOSSIER_QUERY_KEY = ["regions", "dossier"] as const;
export const REGION_DOSSIER_STALE_TIME_MS = 5 * 60 * 1000;

export function useRegionDossierQuery(regionId: Ref<string | null>) {
  return useQuery({
    queryKey: computed(() => [...REGION_DOSSIER_QUERY_KEY, regionId.value] as const),
    queryFn: ({ queryKey }) => fetchRegionDossier(queryKey[queryKey.length - 1] as string),
    staleTime: REGION_DOSSIER_STALE_TIME_MS,
    enabled: computed(() => regionId.value !== null),
  });
}

export const REGION_ACTIVE_SIGNALS_QUERY_KEY = ["regions", "active-signals"] as const;
export const REGION_ACTIVE_SIGNALS_STALE_TIME_MS = 60 * 1000;

export function useRegionActiveSignalsQuery(regionId: Ref<string | null>) {
  return useQuery({
    queryKey: computed(() => [...REGION_ACTIVE_SIGNALS_QUERY_KEY, regionId.value] as const),
    queryFn: ({ queryKey }) => fetchRegionActiveSignals(queryKey[queryKey.length - 1] as string),
    staleTime: REGION_ACTIVE_SIGNALS_STALE_TIME_MS,
    enabled: computed(() => regionId.value !== null),
    refetchOnWindowFocus: true,
  });
}
