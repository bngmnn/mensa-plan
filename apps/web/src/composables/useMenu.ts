import { computed, onMounted, ref } from "vue";

import type { DayMenu, WeekMenuResponse } from "@mensa/shared";

import { fetchWeekMenu } from "../api";
import {
  buildWeekdaySelection,
  buildWeekdaySelectionFromDate,
} from "../menu-schedule";

export function useMenu() {
  const weekdaySelection = buildWeekdaySelection();
  const weekData = ref<WeekMenuResponse | null>(null);
  const loading = ref(true);
  const error = ref<string | null>(null);
  const selectedDate = ref(weekdaySelection.selectedDate);
  const weekdayOptions = ref(weekdaySelection.options);
  const weekLabel = ref(weekdaySelection.weekLabel);
  const weekCache = new Map<string, WeekMenuResponse>();

  const currentDay = computed<DayMenu | null>(() => {
    if (!weekData.value) return null;
    return (
      weekData.value.days.find((d) => d.serviceDate === selectedDate.value) ??
      weekData.value.days[0] ??
      null
    );
  });

  const totalCategories = computed(
    () => currentDay.value?.stats.totalCategories ?? 0,
  );
  const totalDishes = computed(() => currentDay.value?.stats.totalDishes ?? 0);
  const freshnessLabel = computed(() =>
    weekData.value?.isStale ? "Cached fallback" : "Live",
  );
  const selectedWeekday = computed(
    () =>
      weekdayOptions.value.find((day) => day.isoDate === selectedDate.value) ??
      null,
  );

  async function loadWeek(week: "this_week" | "next_week" = "this_week") {
    loading.value = true;
    error.value = null;

    try {
      const cached = weekCache.get(week);
      if (cached) {
        weekData.value = cached;
        syncWeekdaySelection(cached);
        return;
      }

      const data = await fetchWeekMenu("164", week);
      weekCache.set(week, data);
      weekData.value = data;
      syncWeekdaySelection(data);
    } catch (caughtError) {
      error.value =
        caughtError instanceof Error
          ? caughtError.message
          : "The menu could not be loaded.";
    } finally {
      loading.value = false;
    }
  }

  function selectDay(isoDate: string) {
    selectedDate.value = isoDate;
  }

  function syncWeekdaySelection(data: WeekMenuResponse) {
    const firstDate =
      data.days.find((d) => d.serviceDate === selectedDate.value)
        ?.serviceDate ?? data.days[0]?.serviceDate;
    if (firstDate) {
      const selection = buildWeekdaySelectionFromDate(firstDate);
      if (!data.days.some((d) => d.serviceDate === selectedDate.value)) {
        selectedDate.value = firstDate;
      }
      weekdayOptions.value = selection.options;
      weekLabel.value = selection.weekLabel;
    }
  }

  onMounted(loadWeek);

  return {
    weekData,
    currentDay,
    loading,
    error,
    selectedDate,
    selectedWeekday,
    weekdayOptions,
    weekLabel,
    totalCategories,
    totalDishes,
    freshnessLabel,
    loadWeek,
    selectDay,
  };
}
