import { computed } from "vue";
import { useApiHealthQuery } from "../queries";

type HealthState = "checking" | "connected" | "unavailable";

export function useApiHealthStatus() {
  const apiHealthQuery = useApiHealthQuery();

  const healthState = computed<HealthState>(() => {
    if (apiHealthQuery.isSuccess.value && apiHealthQuery.data.value) {
      return "connected";
    }

    if (apiHealthQuery.isError.value) {
      return "unavailable";
    }

    return "checking";
  });

  const healthLabel = computed(() => {
    if (healthState.value === "connected") {
      return "API connected";
    }

    if (healthState.value === "unavailable") {
      return "API unavailable";
    }

    return "Checking API";
  });

  return { healthState, healthLabel };
}
