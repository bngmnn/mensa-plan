<script setup lang="ts">
import { computed, ref } from "vue";

import type { Dish } from "@mensa/shared";

import DishCard from "./components/DishCard.vue";
import DishShortcut from "./components/DishShortcut.vue";
import { useMenu } from "./composables/useMenu";
import { formatServiceDate } from "./menu-schedule";

const themes = ["carte", "minimal", "vivid"] as const;
type Theme = (typeof themes)[number];
const themeLabels: Record<Theme, string> = {
  carte: "Carte",
  minimal: "Minimal",
  vivid: "Vivid",
};
const activeTheme = ref<Theme>("carte");

function cycleTheme() {
  const idx = themes.indexOf(activeTheme.value);
  activeTheme.value = themes[(idx + 1) % themes.length];
}

const {
  weekData,
  currentDay,
  loading,
  error,
  selectedDate,
  weekdayOptions,
  totalDishes,
  freshnessLabel,
  loadWeek,
  selectDay,
} = useMenu();

const formattedDate = computed(() =>
  formatServiceDate(currentDay.value?.serviceDate ?? selectedDate.value),
);

const warnings = computed(() => weekData.value?.warnings ?? []);

const dishes = computed<Dish[]>(
  () => currentDay.value?.categories.flatMap((c) => c.dishes) ?? [],
);

const categories = computed(
  () => currentDay.value?.categories ?? [],
);

const availableDates = computed(
  () => new Set(weekData.value?.days.map((d) => d.serviceDate) ?? []),
);

function dietType(dish: Dish): "vegan" | "vegetarian" | "meat" {
  const indicators = dish.indicators.map((i) => i.label.toLowerCase());
  if (indicators.some((l) => l.includes("vegan"))) return "vegan";
  if (indicators.some((l) => l.includes("vegetar"))) return "vegetarian";
  return "meat";
}

function isNewDish(dish: Dish): boolean {
  return dish.indicators.some((i) => i.label.toLowerCase().includes("neu"));
}

function studentPrice(dish: Dish): string {
  const price = dish.prices.find((p) => p.audience === "students");
  if (!price) return "";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(price.amount);
}

function categoryIcon(category: string): string {
  const n = category.toLowerCase();
  if (n.includes("grill") || n.includes("wurst")) return "🔥";
  if (n.includes("pasta") || n.includes("nudel")) return "🍝";
  if (n.includes("vegetar") || n.includes("vegan")) return "🌿";
  if (n.includes("suppe") || n.includes("pott")) return "🥣";
  if (n.includes("fisch")) return "🐟";
  if (n.includes("dessert")) return "🍰";
  return "🍽";
}
</script>

<template>
  <div class="mensa" :data-theme="activeTheme">
    <!-- Header -->
    <header class="mensa-header">
      <div class="mensa-header__left">
        <h1 class="mensa-header__title">Mensa</h1>
        <span class="mensa-header__location">{{
          weekData?.location.name ?? "Finkenau"
        }}</span>
      </div>
      <button
        class="theme-toggle"
        type="button"
        :title="`Theme: ${themeLabels[activeTheme]}`"
        @click="cycleTheme"
      >
        <span class="theme-toggle__dot" />
        {{ themeLabels[activeTheme] }}
      </button>
    </header>

    <!-- Day picker -->
    <nav class="day-bar" aria-label="Select weekday">
      <button
        v-for="day in weekdayOptions"
        :key="day.isoDate"
        type="button"
        class="day-tab"
        :class="{
          'day-tab--active': day.isoDate === selectedDate,
          'day-tab--empty': !availableDates.has(day.isoDate),
        }"
        :disabled="!availableDates.has(day.isoDate)"
        @click="selectDay(day.isoDate)"
      >
        <span class="day-tab__name">{{ day.shortLabel }}</span>
        <span v-if="day.isToday" class="day-tab__today">heute</span>
      </button>
    </nav>

    <!-- Loading skeleton -->
    <div v-if="loading" class="skeleton-wrap">
      <div v-for="n in 5" :key="n" class="skeleton-row" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-card">
      <p>{{ error }}</p>
      <button type="button" @click="loadWeek()">Erneut laden</button>
    </div>

    <!-- Menu content -->
    <template v-else-if="currentDay">
      <!-- Warnings -->
      <div v-if="warnings.length" class="warning-banner">
        <p v-for="w in warnings" :key="w">{{ w }}</p>
      </div>

      <!-- Carte theme: classic menu layout -->
      <template v-if="activeTheme === 'carte'">
        <div class="carte">
          <div class="carte__date">{{ formattedDate }}</div>
          <section
            v-for="cat in categories"
            :key="cat.name"
            class="carte__section"
          >
            <h2 class="carte__category">
              <span class="carte__category-icon">{{
                categoryIcon(cat.name)
              }}</span>
              {{ cat.name }}
            </h2>
            <ul class="carte__list">
              <li
                v-for="dish in cat.dishes"
                :key="dish.id"
                class="carte__item"
                :class="{
                  'carte__item--vegan': dietType(dish) === 'vegan',
                  'carte__item--vegetarian': dietType(dish) === 'vegetarian',
                  'carte__item--new': isNewDish(dish),
                }"
              >
                <div class="carte__item-main">
                  <span
                    v-if="dietType(dish) !== 'meat'"
                    class="carte__diet-icon"
                    :title="
                      dietType(dish) === 'vegan' ? 'Vegan' : 'Vegetarisch'
                    "
                  >
                    {{ dietType(dish) === "vegan" ? "🌱" : "🥚" }}
                  </span>
                  <span class="carte__dish-name">{{ dish.name }}</span>
                  <span class="carte__dots" />
                  <span class="carte__price">{{ studentPrice(dish) }}</span>
                </div>
                <div class="carte__meta">
                  <DishShortcut
                    v-for="allergen in dish.allergens.slice(0, 5)"
                    :key="allergen.code"
                    :shortcut="allergen.code"
                    :label="allergen.label"
                    tone="neutral"
                  />
                  <DishShortcut
                    v-for="metric in dish.sustainability"
                    :key="metric.label"
                    :shortcut="
                      metric.label.toLowerCase().includes('co') ? 'CO₂' : '★'
                    "
                    :label="metric.label"
                    :description="
                      metric.value
                        ? `${metric.value} · ${metric.rating}/3`
                        : `${metric.rating}/3`
                    "
                    tone="success"
                  />
                </div>
              </li>
            </ul>
          </section>
          <p class="carte__footer">
            Preise für Studierende ·
            {{ totalDishes }} Gerichte · {{ freshnessLabel }}
          </p>
        </div>
      </template>

      <!-- Minimal theme: cards with strong type hierarchy -->
      <template v-else-if="activeTheme === 'minimal'">
        <div class="mini-grid">
          <DishCard
            v-for="dish in dishes"
            :key="dish.id"
            :dish="dish"
            theme="minimal"
          />
        </div>
        <p class="mini-footer">
          {{ formattedDate }} · {{ totalDishes }} Gerichte ·
          {{ freshnessLabel }}
        </p>
      </template>

      <!-- Vivid theme: bold color-blocked categories -->
      <template v-else-if="activeTheme === 'vivid'">
        <div class="vivid">
          <section
            v-for="cat in categories"
            :key="cat.name"
            class="vivid__section"
          >
            <div class="vivid__header">
              <span class="vivid__icon">{{ categoryIcon(cat.name) }}</span>
              <h2>{{ cat.name }}</h2>
              <span class="vivid__count">{{ cat.dishes.length }}</span>
            </div>
            <div class="vivid__cards">
              <DishCard
                v-for="dish in cat.dishes"
                :key="dish.id"
                :dish="dish"
                theme="vivid"
              />
            </div>
          </section>
        </div>
        <p class="vivid-footer">
          {{ formattedDate }} · {{ freshnessLabel }}
        </p>
      </template>
    </template>
  </div>
</template>
