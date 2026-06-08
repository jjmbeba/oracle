import { useQuery } from "@tanstack/vue-query";
import { fetchApiHealth } from "./api";

export const API_HEALTH_QUERY_KEY = ["api-health"] as const;

export function useApiHealthQuery() {
  return useQuery({
    queryKey: API_HEALTH_QUERY_KEY,
    queryFn: () => fetchApiHealth(),
    retry: false,
  });
}
