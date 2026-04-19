<script setup lang="ts">
import { computed } from "vue";

import type { Dish } from "@mensa/shared";

import DishShortcut from "./DishShortcut.vue";

const props = defineProps<{
  dish: Dish;
  theme?: "minimal" | "vivid";
}>();

function dietType(dish: Dish): "vegan" | "vegetarian" | "meat" {
  const indicators = dish.indicators.map((i) => i.label.toLowerCase());
  if (indicators.some((l) => l.includes("vegan"))) return "vegan";
  if (indicators.some((l) => l.includes("vegetar"))) return "vegetarian";
  return "meat";
}

function isNew(dish: Dish): boolean {
  return dish.indicators.some((i) => i.label.toLowerCase().includes("neu"));
}

const diet = computed(() => dietType(props.dish));

const prices = computed(() =>
  props.dish.prices.map((p) => ({
    label: p.audience === "students" ? "Stud." : p.audience === "staff" ? "Bed." : "Gäste",
    value: new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(p.amount),
  })),
);

const studentPrice = computed(() => {
  const p = props.dish.prices.find((p) => p.audience === "students");
  if (!p) return "";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(p.amount);
});

const dietIcon = computed(() => {
  if (diet.value === "vegan") return "🌱";
  if (diet.value === "vegetarian") return "🥚";
  return "";
});
</script>

<template>
  <!-- Minimal theme card -->
  <article
    v-if="theme === 'minimal'"
    class="mini-card"
    :class="{
      'mini-card--vegan': diet === 'vegan',
      'mini-card--vegetarian': diet === 'vegetarian',
      'mini-card--new': isNew(dish),
    }"
  >
    <div class="mini-card__top">
      <span v-if="dietIcon" class="mini-card__diet">{{ dietIcon }}</span>
      <span class="mini-card__category">{{ dish.category }}</span>
      <span class="mini-card__price">{{ studentPrice }}</span>
    </div>
    <h3 class="mini-card__name">{{ dish.name }}</h3>
    <div class="mini-card__prices">
      <span v-for="p in prices" :key="p.label" class="mini-card__price-item">
        {{ p.label }} {{ p.value }}
      </span>
    </div>
    <div v-if="dish.allergens.length || dish.sustainability.length" class="mini-card__meta">
      <DishShortcut
        v-for="allergen in dish.allergens.slice(0, 4)"
        :key="allergen.code"
        :shortcut="allergen.code"
        :label="allergen.label"
        tone="neutral"
      />
      <DishShortcut
        v-for="metric in dish.sustainability"
        :key="metric.label"
        :shortcut="metric.label.toLowerCase().includes('co') ? 'CO₂' : '★'"
        :label="metric.label"
        :description="metric.value ? `${metric.value} · ${metric.rating}/3` : `${metric.rating}/3`"
        tone="success"
      />
    </div>
  </article>

  <!-- Vivid theme card -->
  <article
    v-else-if="theme === 'vivid'"
    class="vivid-card"
    :class="{
      'vivid-card--vegan': diet === 'vegan',
      'vivid-card--vegetarian': diet === 'vegetarian',
      'vivid-card--new': isNew(dish),
    }"
  >
    <div class="vivid-card__badge" v-if="isNew(dish)">NEU</div>
    <div class="vivid-card__diet-strip" v-if="diet !== 'meat'">
      {{ diet === "vegan" ? "🌱 Vegan" : "🥚 Vegetarisch" }}
    </div>
    <h3 class="vivid-card__name">{{ dish.name }}</h3>
    <div class="vivid-card__prices">
      <span v-for="p in prices" :key="p.label" class="vivid-card__price">
        <small>{{ p.label }}</small> {{ p.value }}
      </span>
    </div>
    <div v-if="dish.allergens.length" class="vivid-card__tags">
      <DishShortcut
        v-for="allergen in dish.allergens.slice(0, 5)"
        :key="allergen.code"
        :shortcut="allergen.code"
        :label="allergen.label"
        tone="neutral"
      />
    </div>
  </article>
</template>
