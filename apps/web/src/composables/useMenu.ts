import { computed, onMounted, ref } from "vue";

import type { MenuResponse } from "@mensa/shared";

import { fetchMenu } from "../api";
import {
  buildWeekdaySelection,
  buildWeekdaySelectionFromDate,
} from "../menu-schedule";

export function useMenu() {
  const weekdaySelection = buildWeekdaySelection();
  const menuCache = new Map<string, MenuResponse>();
  const menu = ref<MenuResponse | null>(null);
  const loading = ref(true);
  const error = ref<string | null>(null);
  const selectedDate = ref(weekdaySelection.selectedDate);
  const weekdayOptions = ref(weekdaySelection.options);
  const weekLabel = ref(weekdaySelection.weekLabel);

  async function loadMenu(day = "today") {
    loading.value = true;
    error.value = null;

    try {
      const cacheKey = day;
      const cached = menuCache.get(cacheKey);

      if (cached) {
        menu.value = cached;
        syncWeekdaySelection(cached.serviceDate);
        return;
      }

      const fetchedMenu = await fetchMenu("164", day);
      menuCache.set(cacheKey, fetchedMenu);
      menu.value = fetchedMenu;
      syncWeekdaySelection(fetchedMenu.serviceDate);
    } catch (caughtError) {
      error.value =
        caughtError instanceof Error
          ? caughtError.message
          : "The menu could not be loaded.";
    } finally {
      loading.value = false;
    }
  }

  onMounted(loadMenu);

  const totalCategories = computed(
    () => menu.value?.stats.totalCategories ?? 0,
  );
  const totalDishes = computed(() => menu.value?.stats.totalDishes ?? 0);
  const freshnessLabel = computed(() =>
    menu.value?.isStale ? "Cached fallback" : "Live from API",
  );
  const selectedWeekday = computed(
    () =>
      weekdayOptions.value.find((day) => day.isoDate === selectedDate.value) ??
      null,
  );

  async function selectDay(day: string) {
    if (day === selectedDate.value && menu.value) {
      return;
    }

    await loadMenu(day);
  }

  function syncWeekdaySelection(serviceDate: string) {
    const selection = buildWeekdaySelectionFromDate(serviceDate);
    selectedDate.value = serviceDate;
    weekdayOptions.value = selection.options;
    weekLabel.value = selection.weekLabel;
  }

  return {
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
  };
}
