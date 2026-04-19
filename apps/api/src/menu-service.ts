import type { MenuResponse } from "@mensa/shared";

import { buildSourceUrl, getLocation } from "./locations";
import type { MenuSource } from "./menu-source";
import { StwhhMenuSource } from "./menu-source";
import { listMenuServiceDates, parseMenuPage } from "./menu-parser";

const CACHE_TTL_MS = 10 * 60 * 1000;
const UPSTREAM_FILTER_TOKENS = [
  "today",
  "next_day",
  "this_week",
  "next_week",
] as const;
type UpstreamFilterToken = (typeof UPSTREAM_FILTER_TOKENS)[number];

interface CacheEntry {
  menu: MenuResponse;
  updatedAt: number;
}

export interface MenuServiceShape {
  getMenu(locationId: string, day?: string): Promise<MenuResponse>;
  getReadiness(locationId?: string): Promise<"warm" | "stale" | "empty">;
}

export class MenuService implements MenuServiceShape {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly source: MenuSource = new StwhhMenuSource(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  async getMenu(locationId: string, day = "today"): Promise<MenuResponse> {
    const location = getLocation(locationId);
    const normalizedDay = normalizeDay(day);
    const fetchToken = resolveUpstreamFetchToken(normalizedDay);
    const cacheKey =
      normalizedDay.kind === "date"
        ? `${locationId}:${normalizedDay.value}`
        : `${locationId}:${normalizedDay.value}`;
    const nowTimestamp = this.now().getTime();
    const cached = this.cache.get(cacheKey);

    if (cached && nowTimestamp - cached.updatedAt < CACHE_TTL_MS) {
      return cached.menu;
    }

    try {
      const html = await this.source.fetchMenuPage(locationId, fetchToken);
      const availableDates = listMenuServiceDates(html, location.id);
      const serviceDate =
        normalizedDay.kind === "date" ? normalizedDay.value : availableDates[0];

      if (!serviceDate) {
        throw new Error(
          "No published menu was available for the requested period.",
        );
      }
      const menu = parseMenuPage({
        html,
        location,
        serviceDate,
        fetchedAt: this.now().toISOString(),
        sourceUrl: buildSourceUrl(locationId, fetchToken),
      });

      this.cache.set(cacheKey, {
        menu,
        updatedAt: nowTimestamp,
      });

      return menu;
    } catch (error) {
      if (cached) {
        return {
          ...cached.menu,
          isStale: true,
          warnings: [
            ...cached.menu.warnings,
            "Serving cached data because the upstream source could not be refreshed.",
          ],
        };
      }

      throw error;
    }
  }

  async getReadiness(locationId = "164"): Promise<"warm" | "stale" | "empty"> {
    try {
      const menu = await this.getMenu(locationId, "today");
      return menu.isStale ? "stale" : "warm";
    } catch {
      return "empty";
    }
  }
}

function normalizeDay(
  day: string,
):
  | { kind: "token"; value: UpstreamFilterToken }
  | { kind: "date"; value: string } {
  if (isUpstreamFilterToken(day)) {
    return {
      kind: "token",
      value: day,
    };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw new Error(
      'Invalid day. Use "today", "next_day", "this_week", "next_week", or an ISO date like 2026-04-17.',
    );
  }

  return {
    kind: "date",
    value: day,
  };
}

function isUpstreamFilterToken(day: string): day is UpstreamFilterToken {
  return (UPSTREAM_FILTER_TOKENS as readonly string[]).includes(day);
}

function resolveUpstreamFetchToken(
  day:
    | { kind: "token"; value: UpstreamFilterToken }
    | { kind: "date"; value: string },
): UpstreamFilterToken {
  return day.kind === "token" ? day.value : "this_week";
}
