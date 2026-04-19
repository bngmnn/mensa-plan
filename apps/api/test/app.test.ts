import { describe, expect, it } from "vitest";

import type { MenuResponse, WeekMenuResponse } from "@mensa/shared";

import { buildApp } from "../src/app";
import { buildSourceUrl, getLocation } from "../src/locations";
import type { MenuServiceShape } from "../src/menu-service";

const sampleMenu: MenuResponse = {
  location: getLocation("164"),
  serviceDate: "2026-04-17",
  fetchedAt: "2026-04-17T10:00:00.000Z",
  sourceUrl: buildSourceUrl("164", "today"),
  isStale: false,
  warnings: [],
  categories: [
    {
      name: "Pottkieker",
      dishes: [
        {
          id: "32",
          name: "Gemüsegulasch (Sl,Sw), Reis",
          category: "Pottkieker",
          indicators: [],
          allergens: [],
          prices: [
            { audience: "students", amount: 2.2, currency: "EUR" },
            { audience: "staff", amount: 3.5, currency: "EUR" },
            { audience: "guests", amount: 4.8, currency: "EUR" },
          ],
          sustainability: [],
        },
      ],
    },
  ],
  stats: {
    totalCategories: 1,
    totalDishes: 1,
  },
};

const sampleWeekMenu: WeekMenuResponse = {
  location: getLocation("164"),
  fetchedAt: "2026-04-17T10:00:00.000Z",
  sourceUrl: buildSourceUrl("164", "this_week"),
  isStale: false,
  warnings: [],
  days: [
    {
      serviceDate: "2026-04-14",
      categories: sampleMenu.categories,
      stats: sampleMenu.stats,
    },
    {
      serviceDate: "2026-04-17",
      categories: sampleMenu.categories,
      stats: sampleMenu.stats,
    },
  ],
};

function createMenuService(
  overrides?: Partial<MenuServiceShape>,
): MenuServiceShape {
  return {
    getMenu: async () => sampleMenu,
    getWeekMenu: async () => sampleWeekMenu,
    getReadiness: async () => "warm",
    ...overrides,
  };
}

describe("buildApp", () => {
  it("serves locations, menu data, and week menu", async () => {
    const app = await buildApp({
      menuService: createMenuService(),
    });

    const locationsResponse = await app.inject({
      method: "GET",
      url: "/api/v1/locations",
    });
    const menuResponse = await app.inject({
      method: "GET",
      url: "/api/v1/locations/164/menu?day=today",
    });
    const weekResponse = await app.inject({
      method: "GET",
      url: "/api/v1/locations/164/menu/week?week=this_week",
    });

    expect(locationsResponse.statusCode).toBe(200);
    expect(menuResponse.statusCode).toBe(200);
    expect(weekResponse.statusCode).toBe(200);
    expect(menuResponse.json().stats.totalDishes).toBe(1);
    expect(weekResponse.json().days).toHaveLength(2);

    await app.close();
  });

  it("surfaces readiness failures with a degraded health response", async () => {
    const app = await buildApp({
      menuService: createMenuService({
        getReadiness: async () => "empty",
      }),
    });

    const response = await app.inject({
      method: "GET",
      url: "/health/ready",
    });

    expect(response.statusCode).toBe(503);
    expect(response.json().details.cache).toBe("empty");

    await app.close();
  });
});
