import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { fetchWatchedRegions, watchRegion, unwatchRegion } from "./api";

export const WATCHED_REGIONS_QUERY_KEY = ["watched-regions"] as const;

export function useWatchedRegionsQuery() {
  return useQuery({
    queryKey: WATCHED_REGIONS_QUERY_KEY,
    queryFn: () => fetchWatchedRegions(),
  });
}

export function useWatchRegionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (regionId: string) => watchRegion(regionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WATCHED_REGIONS_QUERY_KEY });
    },
  });
}

export function useUnwatchRegionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (regionId: string) => unwatchRegion(regionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WATCHED_REGIONS_QUERY_KEY });
    },
  });
}
