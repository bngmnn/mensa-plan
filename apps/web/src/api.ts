import {
  menuResponseSchema,
  weekMenuResponseSchema,
  type MenuResponse,
  type WeekMenuResponse,
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

export async function fetchWeekMenu(
  locationId = "164",
  week: "this_week" | "next_week" = "this_week",
): Promise<WeekMenuResponse> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/v1/locations/${locationId}/menu/week?week=${week}`,
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? "The week menu could not be loaded.");
  }

  return weekMenuResponseSchema.parse(await response.json());
}
