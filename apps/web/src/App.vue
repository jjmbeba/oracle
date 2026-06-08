<script setup lang="ts">
import { computed } from "vue";
import type { ApiHealth } from "./features/health/api";
import { useApiHealthQuery } from "./features/health/queries";

type HealthState = "checking" | "connected" | "unavailable";

const apiHealthQuery = useApiHealthQuery();
const health = computed<ApiHealth | null>(() => apiHealthQuery.data.value ?? null);
const healthState = computed<HealthState>(() => {
  if (apiHealthQuery.isSuccess.value && health.value) {
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
</script>

<template>
  <main class="app-shell">
    <section class="dashboard-shell" aria-labelledby="dashboard-title">
      <div class="title-group">
        <p class="eyebrow">Oracle</p>
        <h1 id="dashboard-title">Public signal monitoring workspace</h1>
      </div>

      <aside class="status-panel" aria-live="polite">
        <div class="status-row">
          <span class="status-dot" :class="healthState" aria-hidden="true"></span>
          <span class="status-label">{{ healthLabel }}</span>
        </div>

        <p class="status-copy">
          <template v-if="healthState === 'connected' && health">
            {{ health.service.toUpperCase() }} reports {{ health.status }}.
          </template>
          <template v-else-if="healthState === 'unavailable'">
            Local dashboard path could not reach the API.
          </template>
          <template v-else>Confirming local web to API path.</template>
        </p>
      </aside>
    </section>
  </main>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background:
    linear-gradient(135deg, rgba(11, 21, 32, 0.82), rgba(6, 10, 16, 0.96)),
    #090d14;
  color: #eef4ff;
  font-family:
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

.dashboard-shell {
  width: min(100%, 48rem);
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(16rem, 20rem);
  gap: 1.25rem;
  align-items: end;
}

.title-group {
  display: grid;
  gap: 0.625rem;
}

.eyebrow {
  margin: 0;
  color: #78d8c8;
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  max-width: 12ch;
  font-size: 2.5rem;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0;
}

.status-panel {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.26);
  border-radius: 8px;
  background: rgba(12, 19, 29, 0.84);
  box-shadow: 0 1.25rem 3.5rem rgba(0, 0, 0, 0.22);
}

.status-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.status-dot {
  width: 0.625rem;
  height: 0.625rem;
  flex: 0 0 auto;
  border-radius: 999px;
  background: #d8a044;
  box-shadow: 0 0 0 0.25rem rgba(216, 160, 68, 0.16);
}

.status-dot.connected {
  background: #3fd2a8;
  box-shadow: 0 0 0 0.25rem rgba(63, 210, 168, 0.16);
}

.status-dot.unavailable {
  background: #f06f6f;
  box-shadow: 0 0 0 0.25rem rgba(240, 111, 111, 0.16);
}

.status-label {
  font-size: 0.875rem;
  font-weight: 700;
}

.status-copy {
  margin: 0;
  color: #b9c5d6;
  font-size: 0.875rem;
  line-height: 1.5;
}

@media (max-width: 46rem) {
  .app-shell {
    align-items: stretch;
    padding: 1.25rem;
  }

  .dashboard-shell {
    grid-template-columns: 1fr;
    align-content: center;
  }

  h1 {
    max-width: 14ch;
    font-size: 2rem;
  }
}
</style>
