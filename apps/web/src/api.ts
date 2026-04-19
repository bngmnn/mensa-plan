import {
  dishImageResponseSchema,
  menuResponseSchema,
  type DishImageResponse,
  type MenuResponse,
} from "@mensa/shared";

export function getApiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
}

export async function fetchMenu(
  locationId = "164",
  day = "today",
): Promise<MenuResponse> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/v1/locations/${locationId}/menu?day=${day}`,
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? "The menu could not be loaded.");
  }

  return menuResponseSchema.parse(await response.json());
}

export async function fetchDishImage(
  query: string,
): Promise<DishImageResponse> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/v1/images/search?q=${encodeURIComponent(query)}`,
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? "The dish image could not be loaded.");
  }

  return dishImageResponseSchema.parse(await response.json());
}
