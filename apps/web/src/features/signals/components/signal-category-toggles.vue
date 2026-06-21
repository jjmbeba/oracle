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
@use "../../../styles/variables" as *;

.toggles {
  display: flex;
  gap: 0;
}

.toggle {
  padding: 4px 10px;
  border: 1px solid $border-default;
  background: transparent;
  color: $text-meta;
  cursor: pointer;
  font: inherit;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition:
    border-color 0.15s,
    color 0.15s,
    background 0.15s;

  & + & {
    border-left-width: 0;
  }

  &:hover {
    color: $text-heading;
    border-color: $border-hover;
  }

  &.active {
    border-color: $ink;
    color: $ink;
    background: rgba($ink, 0.06);
  }
}
</style>
