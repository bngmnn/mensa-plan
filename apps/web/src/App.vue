<script setup lang="ts">
import { computed } from "vue";

import DishCard from "./components/DishCard.vue";
import { useMenu } from "./composables/useMenu";
import { formatServiceDate } from "./menu-schedule";

const {
  menu,
  loading,
  error,
  selectedDate,
  selectedWeekday,
  weekdayOptions,
  weekLabel,
  totalCategories,
  totalDishes,
  freshnessLabel,
  loadMenu,
  selectDay,
} = useMenu();

const formattedDate = computed(() =>
  formatServiceDate(menu.value?.serviceDate ?? selectedDate.value),
);

const warnings = computed(() => menu.value?.warnings ?? []);
const dishes = computed(
  () => menu.value?.categories.flatMap((category) => category.dishes) ?? [],
);
</script>

<template>
  <main class="app-shell">
    <section class="hero-panel">
      <div class="hero-panel__copy">
        <p class="hero-panel__eyebrow">Mensa plan</p>
        <h1>A calmer, faster way to scan the mensa board.</h1>
        <p class="hero-panel__summary">
          The app automatically follows the published service day after the
          afternoon cutoff and still lets you jump straight to the weekday you
          want to inspect.
        </p>
        <div class="hero-panel__highlights">
          <div class="hero-pill">
            <span class="hero-pill__icon" aria-hidden="true">🗓</span>
            <span>{{ weekLabel }}</span>
          </div>
          <div class="hero-pill">
            <span class="hero-pill__icon" aria-hidden="true">📍</span>
            <span>{{ menu?.location.name ?? "Mensa Finkenau" }}</span>
          </div>
        </div>
      </div>

      <div class="hero-panel__stats">
        <div class="stat-card">
          <span class="stat-card__label"
            ><span aria-hidden="true">🗓</span> Service date</span
          >
          <strong>{{ formattedDate || "Loading…" }}</strong>
        </div>
        <div class="stat-card">
          <span class="stat-card__label"
            ><span aria-hidden="true">◫</span> Categories</span
          >
          <strong>{{ totalCategories }}</strong>
        </div>
        <div class="stat-card">
          <span class="stat-card__label"
            ><span aria-hidden="true">🍽</span> Dishes</span
          >
          <strong>{{ totalDishes }}</strong>
        </div>
        <div class="stat-card">
          <span class="stat-card__label"
            ><span aria-hidden="true">●</span> Freshness</span
          >
          <strong>{{ freshnessLabel }}</strong>
        </div>
      </div>
    </section>

    <section class="status-panel">
      <div class="status-panel__copy">
        <p class="section-heading__eyebrow">Status</p>
        <h2>{{ menu?.location.name ?? "Mensa Finkenau" }}</h2>
        <p>{{ menu?.location.subtitle ?? "Standort Finkenau" }}</p>
      </div>
      <div class="status-panel__actions">
        <div class="weekday-picker">
          <div class="weekday-picker__header">
            <div>
              <p class="section-heading__eyebrow">Week</p>
              <strong>{{ weekLabel }}</strong>
            </div>
            <p>{{ selectedWeekday?.label ?? formattedDate }}</p>
          </div>

          <div class="weekday-picker__list" aria-label="Select weekday">
            <button
              v-for="day in weekdayOptions"
              :key="day.isoDate"
              type="button"
              class="weekday-pill"
              :class="{ 'weekday-pill--active': day.isoDate === selectedDate }"
              @click="selectDay(day.isoDate)"
            >
              <span>{{ day.shortLabel }}</span>
              <small v-if="day.isToday">Today</small>
            </button>
          </div>
        </div>

        <button class="refresh-button" type="button" @click="loadMenu()">
          Refresh menu
        </button>
      </div>
    </section>

    <section v-if="loading" class="content-panel">
      <div class="skeleton-grid" aria-label="Loading menu">
        <div v-for="item in 4" :key="item" class="skeleton-card" />
      </div>
    </section>

    <section v-else-if="error" class="content-panel content-panel--error">
      <h2>Could not load the mensa plan</h2>
      <p>{{ error }}</p>
      <button class="refresh-button" type="button" @click="loadMenu()">
        Try again
      </button>
    </section>

    <template v-else-if="menu">
      <section v-if="warnings.length" class="warning-panel">
        <p v-for="warning in warnings" :key="warning">{{ warning }}</p>
      </section>

      <section class="content-panel">
        <div class="section-heading">
          <div>
            <p class="section-heading__eyebrow">Meals</p>
            <h2>Menu overview</h2>
          </div>
          <p class="section-heading__copy">
            {{ totalDishes }} options across {{ totalCategories }} categories
          </p>
        </div>

        <div class="dish-grid">
          <DishCard v-for="dish in dishes" :key="dish.id" :dish="dish" />
        </div>
      </section>
    </template>
  </main>
</template>
