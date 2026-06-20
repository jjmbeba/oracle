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

<style scoped lang="scss">
@use "../../styles/variables" as *;

.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  min-height: 48px;
  padding: 0 20px;
  background: $bg-surface;
  border-bottom: 1px solid $border-default;
  z-index: 10;

  @media (max-width: 640px) {
    padding: 0 14px;
  }
}

.navbar-brand {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: $text-primary;
  user-select: none;
}

.navbar-health {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  letter-spacing: 0.05em;
  color: $text-secondary;

  &.connected {
    color: $accent-green;

    .health-dot {
      background: $accent-green;
    }
  }

  &.unavailable {
    color: $accent-red;

    .health-dot {
      background: $accent-red;
    }
  }
}

.health-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: $text-secondary;
}
</style>
