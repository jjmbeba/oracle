<script setup lang="ts">
defineProps<{
  healthState: "checking" | "connected" | "unavailable";
  healthLabel: string;
}>();
</script>

<template>
  <nav class="navbar">
    <h1 class="navbar-brand">Oracle</h1>
    <span class="navbar-health" :class="healthState">
      <span class="health-dot" aria-hidden="true"></span>
      {{ healthLabel }}
    </span>
  </nav>
</template>

<style scoped>
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  min-height: 48px;
  padding: 0 20px;
  background: #141414;
  border-bottom: 1px solid #2a2a2a;
  z-index: 10;
}

.navbar-brand {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #c0c0c0;
  user-select: none;
}

.navbar-health {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  letter-spacing: 0.05em;
  color: #666;
}

.health-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #666;
}

.navbar-health.connected .health-dot {
  background: #4a7c59;
}

.navbar-health.connected {
  color: #4a7c59;
}

.navbar-health.unavailable .health-dot {
  background: #8b4a4a;
}

.navbar-health.unavailable {
  color: #8b4a4a;
}

@media (max-width: 640px) {
  .navbar {
    padding: 0 14px;
  }
}
</style>
