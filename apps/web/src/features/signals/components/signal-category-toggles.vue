<script setup lang="ts">
import { CATEGORY_LABELS, SIGNAL_CATEGORIES, type SignalCategory } from "../types";

const props = defineProps<{
  activeCategories: readonly SignalCategory[];
}>();

const emit = defineEmits<{
  "update:activeCategories": [categories: SignalCategory[]];
}>();

function toggle(category: SignalCategory) {
  const isActive = props.activeCategories.includes(category);
  const next = isActive
    ? props.activeCategories.filter((c) => c !== category)
    : [...props.activeCategories, category];
  emit("update:activeCategories", next);
}
</script>

<template>
  <div class="toggles" role="group" aria-label="Signal categories">
    <button
      v-for="category in SIGNAL_CATEGORIES"
      :key="category"
      class="toggle"
      :class="{ active: activeCategories.includes(category) }"
      type="button"
      :aria-pressed="activeCategories.includes(category)"
      @click="toggle(category)"
    >
      {{ CATEGORY_LABELS[category] }}
    </button>
  </div>
</template>

<style scoped lang="scss">
@use '../../../styles/variables' as *;

.toggles {
  display: flex;
  gap: 4px;
}

.toggle {
  padding: 5px 12px;
  border: 1px solid $border-default;
  background: $bg-button;
  color: $text-muted;
  cursor: pointer;
  font: inherit;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition: border-color 0.15s, color 0.15s, background 0.15s;

  &:hover {
    border-color: $border-hover;
    color: $text-heading;
  }

  &.active {
    border-color: $accent-green;
    color: $accent-green;
    background: rgba($accent-green, 0.08);
  }
}
</style>
