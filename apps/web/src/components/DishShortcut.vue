<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{
  shortcut: string;
  label: string;
  description?: string;
  tone?: "neutral" | "accent" | "success";
}>();

const popover = ref<HTMLElement | null>(null);
let closeTimer: number | null = null;

function show(event: MouseEvent | FocusEvent) {
  const trigger = event.currentTarget;

  if (!(trigger instanceof HTMLElement) || !popover.value) {
    return;
  }

  if (closeTimer !== null) {
    window.clearTimeout(closeTimer);
    closeTimer = null;
  }

  positionPopover(trigger, popover.value);

  if (!popover.value.matches(":popover-open")) {
    popover.value.showPopover();
  }
}

function scheduleHide() {
  if (closeTimer !== null) {
    window.clearTimeout(closeTimer);
  }

  closeTimer = window.setTimeout(() => {
    hide();
  }, 80);
}

function hide() {
  if (closeTimer !== null) {
    window.clearTimeout(closeTimer);
    closeTimer = null;
  }

  popover.value?.hidePopover();
}

function keepOpen() {
  if (closeTimer !== null) {
    window.clearTimeout(closeTimer);
    closeTimer = null;
  }
}

function positionPopover(trigger: HTMLElement, tooltip: HTMLElement) {
  const rect = trigger.getBoundingClientRect();
  const top = rect.bottom + 12;
  const left = rect.left + rect.width / 2;

  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;
}
</script>

<template>
  <span class="dish-shortcut">
    <button
      type="button"
      class="dish-shortcut__trigger"
      :class="`dish-shortcut__trigger--${props.tone ?? 'neutral'}`"
      :aria-label="label"
      @mouseenter="show"
      @mouseleave="scheduleHide"
      @focus="show"
      @blur="hide"
      @keydown.esc.prevent="hide"
    >
      {{ shortcut }}
    </button>

    <div
      ref="popover"
      popover="manual"
      class="dish-shortcut__popover"
      @mouseenter="keepOpen"
      @mouseleave="scheduleHide"
    >
      <strong>{{ label }}</strong>
      <p v-if="description">{{ description }}</p>
    </div>
  </span>
</template>
