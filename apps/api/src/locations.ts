import type { Location } from "@mensa/shared";

export const DEFAULT_LOCATION_ID = "164";

const BASE_SOURCE_URL = "https://www.stwhh.de/speiseplan";

export const supportedLocations: Record<string, Location> = {
  [DEFAULT_LOCATION_ID]: {
    id: DEFAULT_LOCATION_ID,
    slug: "mensa-finkenau",
    name: "Mensa Finkenau",
    subtitle: "Standort Finkenau",
    sourceUrl: buildSourceUrl(DEFAULT_LOCATION_ID, "today"),
  },
};

export function listLocations(): Location[] {
  return Object.values(supportedLocations);
}

export function getLocation(locationId: string): Location {
  const location = supportedLocations[locationId];

  if (!location) {
    throw new Error(`Unsupported location: ${locationId}`);
  }

  return location;
}

export function buildSourceUrl(locationId: string, day: string): string {
  const url = new URL(BASE_SOURCE_URL);
  url.searchParams.set("l", locationId);
  url.searchParams.set("t", day);
  return url.toString();
}
