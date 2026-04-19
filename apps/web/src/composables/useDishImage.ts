import { computed, ref, watch } from "vue";

import type { DishImage } from "@mensa/shared";

import { fetchDishImage } from "../api";

const imageCache = new Map<string, Promise<DishImage | null>>();

export function useDishImage(dishName: string) {
  const image = ref<DishImage | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  watch(
    () => dishName,
    async (name) => {
      loading.value = true;
      error.value = null;

      try {
        image.value = await getDishImage(name);
      } catch (caughtError) {
        image.value = null;
        error.value =
          caughtError instanceof Error
            ? caughtError.message
            : "Image lookup unavailable.";
      } finally {
        loading.value = false;
      }
    },
    { immediate: true },
  );

  return {
    image,
    loading,
    error,
    attributionLabel: computed(() =>
      image.value ? "Matched via Pixabay" : null,
    ),
  };
}

async function getDishImage(dishName: string): Promise<DishImage | null> {
  const cached = imageCache.get(dishName);

  if (cached) {
    return cached;
  }

  const request = fetchDishImage(dishName).then((response) => response.result);
  imageCache.set(dishName, request);

  return request;
}
