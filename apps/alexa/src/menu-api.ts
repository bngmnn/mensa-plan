import type { MenuResponse } from "@mensa/shared";

import { getAlexaSkillConfig } from "./config";

export async function fetchMenu(day: string): Promise<MenuResponse> {
  const config = getAlexaSkillConfig();
  const url = new URL(
    `/api/v1/locations/${config.locationId}/menu`,
    `${config.apiBaseUrl}/`,
  );
  url.searchParams.set("day", day);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Menu API returned ${response.status} for ${day}.`);
  }

  return (await response.json()) as MenuResponse;
}
