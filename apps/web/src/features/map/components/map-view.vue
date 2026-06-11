<script setup lang="ts">
import { onMounted, onUnmounted, useTemplateRef } from "vue";
import { useMapLibre } from "../composables/use-map-libre";

const containerRef = useTemplateRef<HTMLDivElement>("map-container");

const { init, destroy } = useMapLibre();

onMounted(() => {
  if (!containerRef.value) return;
  init({ container: containerRef.value });
});

onUnmounted(() => {
  destroy();
});
</script>

<template>
  <div ref="map-container" class="map-container"></div>
</template>

<style scoped>
.map-container {
  position: absolute;
  inset: 0;
}
</style>
