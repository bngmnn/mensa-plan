import { describe, expect, it } from "vitest";

import type { DishImageResponse, MenuResponse } from "@mensa/shared";

import { buildApp } from "../src/app";
import { buildSourceUrl, getLocation } from "../src/locations";
import type { ImageServiceShape } from "../src/image-service";
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

function createMenuService(
  overrides?: Partial<MenuServiceShape>,
): MenuServiceShape {
  return {
    getMenu: async () => sampleMenu,
    getReadiness: async () => "warm",
    ...overrides,
  };
}

function createImageService(
  overrides?: Partial<ImageServiceShape>,
): ImageServiceShape {
  return {
    searchDishImage: async (query: string): Promise<DishImageResponse> => ({
      query,
      result: {
        id: 123,
        title: "Gemüsegulasch",
        imageUrl: "https://cdn.pixabay.com/photo/123.jpg",
        sourceUrl: "https://pixabay.com/photos/gemuesegulasch-123/",
        source: "pixabay",
      },
    }),
    ...overrides,
  };
}

describe("buildApp", () => {
  it("serves locations, menu data, and image search results", async () => {
    const app = await buildApp({
      menuService: createMenuService(),
      imageService: createImageService(),
    });

    const locationsResponse = await app.inject({
      method: "GET",
      url: "/api/v1/locations",
    });
    const menuResponse = await app.inject({
      method: "GET",
      url: "/api/v1/locations/164/menu?day=today",
    });
    const imageResponse = await app.inject({
      method: "GET",
      url: "/api/v1/images/search?q=Gem%C3%BCsegulasch",
    });

    expect(locationsResponse.statusCode).toBe(200);
    expect(menuResponse.statusCode).toBe(200);
    expect(imageResponse.statusCode).toBe(200);
    expect(menuResponse.json().stats.totalDishes).toBe(1);
    expect(imageResponse.json().result.source).toBe("pixabay");

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
