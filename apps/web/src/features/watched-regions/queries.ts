import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { fetchWatchedRegions, watchRegion, unwatchRegion, fetchChangeReport } from "./api";
import type { Ref } from "vue";
import { computed } from "vue";

export const WATCHED_REGIONS_QUERY_KEY = ["watched-regions"] as const;
export const CHANGE_REPORT_QUERY_KEY = ["watched-regions", "change-report"] as const;

export function useWatchedRegionsQuery(enabled?: Ref<boolean>) {
  return useQuery({
    queryKey: WATCHED_REGIONS_QUERY_KEY,
    queryFn: () => fetchWatchedRegions(),
    enabled,
  });
}

export function useChangeReportQuery(regionId: Ref<string | null>) {
  return useQuery({
    queryKey: computed(() => [...CHANGE_REPORT_QUERY_KEY, regionId.value] as const),
    queryFn: ({ queryKey }) => fetchChangeReport(queryKey[queryKey.length - 1] as string),
    staleTime: 60 * 1000,
    enabled: computed(() => regionId.value !== null),
  });
}

function invalidateChangeReportCache(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: CHANGE_REPORT_QUERY_KEY });
}

export function useWatchRegionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (regionId: string) => watchRegion(regionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WATCHED_REGIONS_QUERY_KEY });
      invalidateChangeReportCache(queryClient);
    },
  });
}

export function useUnwatchRegionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (regionId: string) => unwatchRegion(regionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WATCHED_REGIONS_QUERY_KEY });
      invalidateChangeReportCache(queryClient);
    },
  });
}
