<script setup lang="ts">
import { computed } from "vue";

import type { Dish } from "@mensa/shared";

import { useDishImage } from "../composables/useDishImage";
import DishShortcut from "./DishShortcut.vue";

const props = defineProps<{
  dish: Dish;
}>();

const {
  image,
  attributionLabel,
  error: imageError,
} = useDishImage(props.dish.name);

interface ShortcutItem {
  key: string;
  shortcut: string;
  label: string;
  description?: string;
  tone: "neutral" | "accent" | "success";
}

const priceSummary = computed(() =>
  props.dish.prices.map(
    (price) => `${audienceLabel(price.audience)} ${formatEuro(price.amount)}`,
  ),
);

const categoryAccent = computed(() => categoryAccentFor(props.dish.category));
const categoryIcon = computed(() => categoryIconFor(props.dish.category));

const shortcutItems = computed<ShortcutItem[]>(() => [
  ...props.dish.indicators.map((indicator) => ({
    key: `indicator:${indicator.label}`,
    shortcut: indicatorShortcut(indicator.label),
    label: indicator.label,
    description: indicator.description,
    tone: "accent" as const,
  })),
  ...props.dish.allergens.map((allergen) => ({
    key: `allergen:${allergen.code}`,
    shortcut: allergen.code,
    label: allergen.label,
    description: undefined,
    tone: "neutral" as const,
  })),
  ...props.dish.sustainability.map((metric) => ({
    key: `metric:${metric.label}`,
    shortcut: sustainabilityShortcut(metric.label),
    label: metric.label,
    description: metric.value
      ? `${metric.value} · ${metric.rating}/3`
      : `${metric.rating}/3`,
    tone: "success" as const,
  })),
]);

function audienceLabel(audience: Dish["prices"][number]["audience"]): string {
  switch (audience) {
    case "students":
      return "Studierende";
    case "staff":
      return "Bedienstete";
    case "guests":
      return "Gäste";
  }
}

function formatEuro(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function indicatorShortcut(label: string): string {
  const normalized = label.toLowerCase();

  if (normalized.includes("vegan")) {
    return "VG";
  }

  if (normalized.includes("vegetar")) {
    return "VE";
  }

  if (normalized.includes("neu")) {
    return "NEW";
  }

  return label
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function sustainabilityShortcut(label: string): string {
  if (label.toLowerCase().includes("co")) {
    return "CO₂";
  }

  return label
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function categoryIconFor(category: string): string {
  const normalized = category.toLowerCase();

  if (normalized.includes("grill") || normalized.includes("wurst")) {
    return "🍖";
  }

  if (normalized.includes("pasta") || normalized.includes("nudel")) {
    return "🍝";
  }

  if (normalized.includes("vegetar") || normalized.includes("vegan")) {
    return "🥬";
  }

  if (normalized.includes("suppe") || normalized.includes("pott")) {
    return "🥣";
  }

  if (normalized.includes("fisch")) {
    return "🐟";
  }

  if (normalized.includes("dessert")) {
    return "🍰";
  }

  return "🍽";
}

function categoryAccentFor(category: string): string {
  const normalized = category.toLowerCase();

  if (normalized.includes("vegetar") || normalized.includes("vegan")) {
    return "green";
  }

  if (normalized.includes("grill") || normalized.includes("wurst")) {
    return "orange";
  }

  if (normalized.includes("fisch")) {
    return "blue";
  }

  return "slate";
}
</script>

<template>
  <article class="dish-card" :class="`dish-card--${categoryAccent}`">
    <div class="dish-card__topbar">
      <div class="dish-card__category">
        <span class="dish-card__category-icon" aria-hidden="true">{{
          categoryIcon
        }}</span>
        <div>
          <p class="dish-card__eyebrow">{{ dish.category }}</p>
          <p class="dish-card__category-label">Category</p>
        </div>
      </div>

      <img
        v-if="image"
        :src="image.imageUrl"
        :alt="`Reference image for ${dish.name}`"
        class="dish-card__thumb"
      />
    </div>

    <div class="dish-card__header">
      <div>
        <h3>{{ dish.name }}</h3>
      </div>
    </div>

    <div v-if="shortcutItems.length" class="dish-card__shortcuts">
      <DishShortcut
        v-for="item in shortcutItems"
        :key="item.key"
        :shortcut="item.shortcut"
        :label="item.label"
        :description="item.description"
        :tone="item.tone"
      />
    </div>

    <p class="dish-card__prices">{{ priceSummary.join(" · ") }}</p>

    <div class="dish-card__footer">
      <span v-if="attributionLabel" class="dish-card__source">
        {{ attributionLabel }}
      </span>
      <a
        v-if="image"
        :href="image.sourceUrl"
        target="_blank"
        rel="noreferrer"
        class="dish-card__link"
      >
        Open Pixabay image
      </a>
    </div>

    <p v-if="imageError" class="dish-card__image-note">{{ imageError }}</p>
  </article>
</template>
